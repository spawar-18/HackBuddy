const { OpenAI } = require('openai');

/**
 * Strip Qwen3 <think>...</think> reasoning blocks from AI response text.
 * Qwen3 models often wrap their output in <think> tags before the actual content.
 * @param {string} text - Raw AI response text
 * @returns {string} Text with think blocks removed
 */
const stripThinkTags = (text) => {
  if (!text) return '';
  // Remove all <think>...</think> blocks (including multiline)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Also handle unclosed <think> tags (model cut off before closing)
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '').trim();
  return cleaned;
};

/**
 * Attempt to repair truncated JSON by balancing braces and brackets.
 * Useful when max_tokens cuts the response mid-JSON.
 * @param {string} jsonStr - Potentially truncated JSON string
 * @returns {string} Repaired JSON string
 */
const repairTruncatedJson = (jsonStr) => {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  // If we're inside a string, close it
  let repaired = jsonStr;
  if (inString) repaired += '"';

  // Close any unclosed brackets/braces
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }

  return repaired;
};

/**
 * Clean up and parse the AI response text as JSON
 * @param {string} responseText - Text returned by the model
 * @returns {object} Parsed JSON analysis
 */
const cleanAndParseResponse = (responseText) => {
  const stripped = stripThinkTags(responseText);
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    console.error('Failed to parse AI response: No JSON object found. Response:', responseText.substring(0, 500));
    throw new Error('Invalid AI JSON response: No JSON object found in response');
  }
  const cleanText = stripped.substring(firstBrace, lastBrace + 1).trim();

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseErr) {
    console.error('Failed to parse AI response as JSON:', responseText);
    throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
  }

  const requiredKeys = ['readinessScore', 'strengths', 'skillGaps', 'recommendedRoles'];
  const missingKeys = requiredKeys.filter(key => !(key in parsed));
  if (missingKeys.length > 0) {
    throw new Error(`Invalid AI JSON response: Missing required fields: ${missingKeys.join(', ')}`);
  }

  if (typeof parsed.readinessScore !== 'number' || parsed.readinessScore < 1 || parsed.readinessScore > 10) {
    parsed.readinessScore = 5.0;
  }

  if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
  if (!Array.isArray(parsed.skillGaps)) parsed.skillGaps = [];
  if (!Array.isArray(parsed.recommendedRoles)) parsed.recommendedRoles = [];

  return parsed;
};

/**
 * Analyzes team readiness and skills using Qwen/Qwen3.6-35B-A3B.
 * Falls back to OpenRouter or Mock.
 * @param {string} teamDataString - Context representation of the team and its members
 * @returns {Promise<object>} Parsed structured analysis JSON
 */
const analyzeTeamWithAI = async (teamDataString) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!qwenKey && !openRouterKey) {
    console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock analysis.');
    return generateMockAnalysis(teamDataString);
  }

  const prompt = `Analyze this hackathon team.

Evaluate the team based on the members and their skills.

Assign roles based ONLY on technical skills.

Role Mapping Guidelines:
- React + Node.js + MongoDB -> Full Stack Developer
- React only -> Frontend Developer
- Node.js + Databases -> Backend Developer
- Python + TensorFlow + Machine Learning -> AI Engineer
- Figma + UI/UX -> UI/UX Designer
- DevOps tools -> DevOps Engineer

Rules:
1. Assign exactly one role per member.
2. Use strongest skills only.
3. Be consistent.
4. Return ONLY valid JSON.
5. Readiness Score must be based on available skills and be a number between 1 and 10.

Required Format:
{
"readinessScore": number,
"strengths": ["string"],
"skillGaps": ["string"],
"recommendedRoles": [
  {
    "member": "string",
    "role": "string"
  }
]
}

Team:

${teamDataString}`;

  if (qwenKey) {
    try {
      console.log(`Attempting deterministic Qwen team analysis via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 20000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await qwenClient.chat.completions.create({
        model: 'Qwen/Qwen3.6-35B-A3B',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 1500,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseResponse(responseText);
    } catch (qwenError) {
      console.error('Qwen API call failed:', qwenError.message || qwenError);
      if (!openRouterKey) {
        throw new Error(`Qwen API error: ${qwenError.message || 'Unknown error'}`);
      }
      console.log('Automatically falling back to OpenRouter...');
    }
  }

  if (openRouterKey) {
    try {
      console.log('Attempting deterministic Qwen team analysis via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: 'qwen/qwen3.6-35b-a3b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 1500,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseResponse(responseText);
    } catch (openRouterError) {
      console.error('OpenRouter API call failed:', openRouterError.message || openRouterError);
      throw new Error(`AI API failure: ${openRouterError.message || 'Failed to communicate with AI endpoint'}`);
    }
  }

  return generateMockAnalysis(teamDataString);
};

/**
 * Generates mock team analysis for testing/fallback
 * @param {string} teamDataString - Context of the team
 * @returns {object} Mock analysis
 */
const generateMockAnalysis = (teamDataString) => {
  const lines = teamDataString.split('\n');
  const members = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Members:')) continue;
    if (line.startsWith('Team Name:')) continue;
    if (line.startsWith('Skills:')) continue;
    if (line === '') continue;
    
    if (i > 0 && lines[i - 1].trim().startsWith('Skills:')) {
      continue;
    }
    
    if (line && !line.includes(',') && !line.includes(':')) {
      members.push(line);
    }
  }

  const finalMembers = members.length > 0 ? members : ['Sahil'];
  
  const recommendedRoles = finalMembers.map((member) => {
    return {
      member,
      role: 'Full Stack Developer'
    };
  });

  return {
    readinessScore: 8.0,
    strengths: [
      'Frontend Development',
      'Backend Development',
      'Database Architecture'
    ],
    skillGaps: [
      'DevOps & CI/CD',
      'Testing & QA'
    ],
    recommendedRoles
  };
};

/**
 * Clean up and parse the AI Project Review response text as JSON
 * @param {string} responseText - Text returned by the model
 * @returns {object} Parsed JSON project review
 */
const cleanAndParseProjectReview = (responseText) => {
  const stripped = stripThinkTags(responseText);
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    console.error('Failed to parse AI project review: No JSON object found. Response:', responseText.substring(0, 500));
    throw new Error('Invalid AI JSON response: No JSON object found in response');
  }
  const cleanText = stripped.substring(firstBrace, lastBrace + 1).trim();

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseErr) {
    console.error('Failed to parse AI project review response as JSON:', responseText);
    throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
  }

  if (typeof parsed.feasibilityScore !== 'number') parsed.feasibilityScore = 5.0;
  if (typeof parsed.problemSolutionAlignment !== 'string') parsed.problemSolutionAlignment = '';
  if (!Array.isArray(parsed.projectRisks)) parsed.projectRisks = [];
  if (!Array.isArray(parsed.missingSkills)) parsed.missingSkills = [];
  if (!Array.isArray(parsed.mustBuildFeatures)) parsed.mustBuildFeatures = [];
  if (!Array.isArray(parsed.optionalFeatures)) parsed.optionalFeatures = [];
  if (!Array.isArray(parsed.featuresToRemove)) parsed.featuresToRemove = [];
  if (!Array.isArray(parsed.improvementSuggestions)) parsed.improvementSuggestions = [];
  if (typeof parsed.reasoning !== 'string') parsed.reasoning = '';
  if (typeof parsed.judgePerspective !== 'string') parsed.judgePerspective = '';
  if (!Array.isArray(parsed.executionStrategy)) parsed.executionStrategy = [];

  return parsed;
};

/**
 * Generates mock project review for fallback/testing
 * @param {string} projectContextString - Context representation of the project and team skills
 * @returns {object} Mock review
 */
const generateMockProjectReview = (projectContextString) => {
  return {
    feasibilityScore: 8.5,
    problemSolutionAlignment: 'The proposed solution aligns strongly with the problem of hackathon scope inflation. The core features address the key pain points directly, but the technical scope is slightly high for the duration.',
    projectRisks: [
      ' Featherless AI service integration timeout risks',
      ' Incomplete feature loop on user dashboards during live presentation',
      ' Scope creep leading to unfinished components'
    ],
    missingSkills: [
      ' Cloud infrastructure configuration',
      ' Professional database scaling'
    ],
    mustBuildFeatures: [
      ' AI Project Review Core API',
      ' Form Validation and character thresholds',
      ' Loading/spinner dashboard feedback'
    ],
    optionalFeatures: [
      ' Team member messaging integrations',
      ' Live sync with GitHub repo commits'
    ],
    featuresToRemove: [
      ' Advanced LLM multi-agent fine-tuning modules'
    ],
    improvementSuggestions: [
      ' Focus strictly on validating problem statement text input to ensure high review accuracy.',
      ' Optimize Qwen temperature settings to 0 to yield highly deterministic responses.'
    ],
    reasoning: 'The technical blueprint is highly structured, and the team members possess strong full-stack skills. Postponing high-overhead features will guarantee a successful working prototype.',
    judgePerspective: 'Judges will prioritize a functional end-to-end user loop. Avoid displaying too many disabled features on the UI during demo day.',
    executionStrategy: [
      '1. Map schema changes in the database model.',
      '2. Implement POST /api/projects/:projectId/analyze route with auto-invalidation.',
      '3. Integrate frontend triggers, loading states, and custom result cards.',
      '4. Verify correct rendering under both success and mock-fallback states.'
    ]
  };
};

/**
 * Analyzes project feasibility, risks, features alignment, missing skills, etc.
 * Falls back to OpenRouter or Mock if needed.
 * @param {string} projectContextString - Context representation of the project and team skills
 * @returns {Promise<object>} Parsed structured review JSON
 */
const analyzeProjectWithAI = async (projectContextString) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!qwenKey && !openRouterKey) {
    console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock project review.');
    return generateMockProjectReview(projectContextString);
  }

  const prompt = `You are an experienced hackathon mentor, software architect, startup advisor, and hackathon judge.

Analyze the project using:
* Problem Statement
* Project Description
* Features To Build
* Team Skills
* Hackathon Duration
* Track

Evaluate:
1. Whether the solution actually solves the stated problem.
2. Whether the team can realistically build it.
3. Whether the scope is too large or too small.
4. Which features are essential.
5. Which features should be postponed.
6. Which features add unnecessary complexity.
7. Which skills are missing.
8. How the project can be improved.
9. How judges are likely to evaluate it.

Rules:
* Do not provide generic suggestions.
* Base recommendations strictly on project context.
* Think like a hackathon judge.
* Think like a technical architect.
* Think like a mentor helping the team maximize impact.
* Return JSON only.

Required Format:
{
"feasibilityScore": number,
"problemSolutionAlignment": "string",
"projectRisks": ["string"],
"missingSkills": ["string"],
"mustBuildFeatures": ["string"],
"optionalFeatures": ["string"],
"featuresToRemove": ["string"],
"improvementSuggestions": ["string"],
"reasoning": "string",
"judgePerspective": "string",
"executionStrategy": ["string"]
}

Project context:
${projectContextString}`;

  if (qwenKey) {
    try {
      console.log(`Attempting deterministic Qwen project review via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 25000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await qwenClient.chat.completions.create({
        model: 'Qwen/Qwen3.6-35B-A3B',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 2500,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseProjectReview(responseText);
    } catch (qwenError) {
      console.error('Qwen API call for project review failed:', qwenError.message || qwenError);
      if (!openRouterKey) {
        throw new Error(`Qwen API error: ${qwenError.message || 'Unknown error'}`);
      }
      console.log('Automatically falling back to OpenRouter for project review...');
    }
  }

  if (openRouterKey) {
    try {
      console.log('Attempting deterministic Qwen project review via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: 'qwen/qwen3.6-35b-a3b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 2500,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseProjectReview(responseText);
    } catch (openRouterError) {
      console.error('OpenRouter API call for project review failed:', openRouterError.message || openRouterError);
      throw new Error(`AI API failure: ${openRouterError.message || 'Failed to communicate with AI endpoint'}`);
    }
  }

  return generateMockProjectReview(projectContextString);
};

/**
 * Generates mock mentor chat response for testing/fallback
 * @param {string} currentQuestion - Question asked by user
 * @param {string} projectContextString - Project details context
 * @returns {string} Mock answer
 */
const generateMockChatResponse = (currentQuestion, projectContextString) => {
  const qLower = currentQuestion.toLowerCase();
  if (qLower.includes('judge') || qLower.includes('questions')) {
    return `Based on your project's problem statement and track, here are the questions judges are most likely to ask:

1. **"What is the core algorithm behind the settlement optimizer, and how do you ensure correctness?"**
   * *How to answer*: Explain your greedy approach to transaction minimization, and mention your automated unit testing setup for uneven splits.
2. **"Why is AI Mentor/Copilot needed here instead of a simple static optimizer?"**
   * *How to answer*: Highlight how AI guides scope optimization, analyzes the problem-solution alignment, and dynamically mitigates risks, rather than just solving mathematical splits.
3. **"How will you handle circular debts in large group payments?"**
   * *How to answer*: Clarify how graph cycle-detection handles and scales circular dependencies before triggering transaction payouts.`;
  }
  if (qLower.includes('improve')) {
    return `To improve your project and maximize your chance of winning:

1. **Refine the Presentation**: Prepare a clear visual graph showing "Before: 12 payments needed" vs "After: 4 payments needed". Judges love quantified impact.
2. **Handle Edge Cases**: Ensure that custom splits (e.g. uneven percentages or specific item splits) work flawlessly, as judges often input custom numbers during live testing.
3. **Mock Data seeding**: Pre-load high-quality sample data so you do not waste time creating groups from scratch during the 3-minute pitch.`;
  }
  if (qLower.includes('feasibility') || qLower.includes('score') || qLower.includes('low')) {
    return `Your feasibility score reflects the complexity of the feature set relative to your team's background skills. To raise it:
* Postpone payment integrations (like Razorpay) and complex Docker deployments.
* Build the core settlement plan generation and visual graph first. Focusing on these will prove solution viability within the hackathon limits.`;
  }
  return `That's a very practical question. Given your team's current skills and the hackathon duration, I recommend focusing on getting the core React dashboard and Node backend database state connected first. AI review layers should be mocked/stubbed out if time starts running short. Let me know which specific component you want to deep dive into!`;
};

/**
 * Interacts with HackVerse AI Mentor using Qwen/Qwen3.6-35B-A3B.
 * @param {string} projectContextString - Formatted project context details
 * @param {Array<object>} history - Recent message history [{role, message}]
 * @param {string} currentQuestion - User's question
 * @returns {Promise<string>} AI text answer
 */
const chatWithMentorAI = async (projectContextString, history, currentQuestion) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!qwenKey && !openRouterKey) {
    console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock chat.');
    return generateMockChatResponse(currentQuestion, projectContextString);
  }

  const systemPrompt = `You are HackVerse AI Mentor.
You are:
* Hackathon Mentor
* Technical Architect
* Startup Advisor
* Product Strategist
* Hackathon Judge

You are helping a team improve their hackathon project.

You already know the following project context details:
${projectContextString}

Your job is to provide practical, project-specific guidance.

Rules:
1. Never give generic advice.
2. Always reference the actual project context.
3. Explain reasoning clearly.
4. Help the team maximize impact.
5. Help the team reduce unnecessary complexity.
6. Think like a judge evaluating the project.
7. Think like a mentor helping the team finish on time.
8. If asked about features, consider the project review.
9. If asked about feasibility, explain based on skills and scope.
10. Be constructive and actionable.

Answer in a conversational format.
Do not return JSON. Use Markdown for list and formatting if appropriate.`;

  const messages = [{ role: 'system', content: systemPrompt }];

  history.forEach(h => {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.message
    });
  });

  messages.push({ role: 'user', content: currentQuestion });

  if (qwenKey) {
    try {
      console.log(`Attempting deterministic Qwen mentor chat via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 25000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await qwenClient.chat.completions.create({
        model: 'Qwen/Qwen3.6-35B-A3B',
        messages: messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1500,
      });

      return response.choices[0]?.message?.content || 'No response from mentor AI.';
    } catch (qwenError) {
      console.error('Qwen API call for mentor chat failed:', qwenError.message || qwenError);
      if (!openRouterKey) {
        throw new Error(`Qwen API error: ${qwenError.message || 'Unknown error'}`);
      }
      console.log('Automatically falling back to OpenRouter for mentor chat...');
    }
  }

  if (openRouterKey) {
    try {
      console.log('Attempting deterministic Qwen mentor chat via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: 'qwen/qwen3.6-35b-a3b',
        messages: messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1500,
      });

      return response.choices[0]?.message?.content || 'No response from mentor AI.';
    } catch (openRouterError) {
      console.error('OpenRouter API call for mentor chat failed:', openRouterError.message || openRouterError);
      throw new Error(`AI API failure: ${openRouterError.message || 'Failed to communicate with AI endpoint'}`);
    }
  }

  return generateMockChatResponse(currentQuestion, projectContextString);
};

// ============================================================
// AI TASK SPLITTER
// ============================================================

/**
 * Clean and parse AI task plan response
 * @param {string} responseText - Raw AI output
 * @returns {object} Validated task plan object
 */
const cleanAndParseTaskPlan = (responseText) => {
  const stripped = stripThinkTags(responseText);
  console.log('Task plan response after stripping think tags (first 300 chars):', stripped.substring(0, 300));
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace === -1) {
    console.error('Failed to parse AI task plan: No JSON object found. Raw response (first 500):', responseText.substring(0, 500));
    throw new Error('Invalid AI JSON response: No JSON object found in response');
  }

  let cleanText;
  if (lastBrace === -1 || lastBrace < firstBrace) {
    // JSON was truncated by max_tokens — attempt repair
    console.warn('Task plan JSON appears truncated, attempting repair...');
    cleanText = repairTruncatedJson(stripped.substring(firstBrace));
  } else {
    cleanText = stripped.substring(firstBrace, lastBrace + 1).trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseErr) {
    // Try repair on parse failure too (e.g. truncated inside the last brace range)
    try {
      console.warn('Initial parse failed, attempting JSON repair...');
      const repaired = repairTruncatedJson(stripped.substring(firstBrace));
      parsed = JSON.parse(repaired);
    } catch (repairErr) {
      console.error('Failed to parse AI task plan response as JSON (even after repair):', stripped.substring(0, 500));
      throw new Error('Invalid AI JSON response: The task plan response could not be parsed as JSON');
    }
  }

  if (!parsed.projectTasks || typeof parsed.projectTasks !== 'object') parsed.projectTasks = {};
  if (!Array.isArray(parsed.projectTasks.coreFeatures)) parsed.projectTasks.coreFeatures = [];
  if (!Array.isArray(parsed.projectTasks.technicalTasks)) parsed.projectTasks.technicalTasks = [];
  if (!Array.isArray(parsed.projectTasks.deploymentTasks)) parsed.projectTasks.deploymentTasks = [];
  if (!Array.isArray(parsed.assignments)) parsed.assignments = [];
  if (!Array.isArray(parsed.workloadDistribution)) parsed.workloadDistribution = [];
  if (!Array.isArray(parsed.executionOrder)) parsed.executionOrder = [];
  if (!Array.isArray(parsed.criticalTasks)) parsed.criticalTasks = [];
  if (!Array.isArray(parsed.recommendedFocus)) parsed.recommendedFocus = [];
  if (!Array.isArray(parsed.warnings)) parsed.warnings = [];

  // Normalize assignedTasks: can come as strings or objects
  parsed.assignments = parsed.assignments.map(a => ({
    member: a.member || '',
    skills: Array.isArray(a.skills) ? a.skills : [],
    assignedTasks: Array.isArray(a.assignedTasks)
      ? a.assignedTasks.map(t =>
          typeof t === 'string'
            ? { task: t, status: 'Not Started' }
            : { task: t.task || String(t), status: t.status || 'Not Started' }
        )
      : [],
    reason: a.reason || ''
  }));

  return parsed;
};

/**
 * Validate that a parsed task plan has meaningful content (not truncated)
 * @param {object} plan - Parsed task plan
 * @param {Array} members - Expected team members
 * @throws {Error} If the plan appears truncated or incomplete
 */
const validateTaskPlanCompleteness = (plan, members) => {
  if (!plan.assignments || plan.assignments.length === 0) {
    throw new Error('AI response was truncated: assignments are missing');
  }
  if (!plan.executionOrder || plan.executionOrder.length === 0) {
    throw new Error('AI response was truncated: executionOrder is missing');
  }
  // Check that at least some members got assignments
  const assignedMembers = plan.assignments.map(a => a.member.toLowerCase());
  const expectedMembers = members.map(m => m.name.toLowerCase());
  const matched = expectedMembers.filter(m => assignedMembers.some(a => a.includes(m) || m.includes(a)));
  if (matched.length === 0 && members.length > 0) {
    console.warn('Warning: No team members matched in assignments. Assigned:', assignedMembers, 'Expected:', expectedMembers);
  }
};

/**
 * Generates a mock task plan for testing / fallback
 * @param {string} contextString - Project context
 * @param {Array} members - Array of { name, skills }
 * @returns {object} Mock task plan
 */
const generateMockTaskPlan = (contextString, members) => {
  const count = members.length || 1;

  const allTasks = [
    'Project Architecture & Database Schema Design',
    'Authentication & Authorization (JWT)',
    'User Management & Profile API',
    'Frontend Routing & Navigation Setup',
    'Core Feature Backend API Endpoints',
    'Frontend UI Components & Pages',
    'State Management & API Integration',
    'AI Feature Integration',
    'Input Validation & Error Handling',
    'Testing & Bug Fixes',
    'Environment Configuration',
    'Production Deployment & Demo Preparation'
  ];

  const assignments = members.map((m, idx) => {
    const start = Math.floor((idx / count) * allTasks.length);
    const end = Math.floor(((idx + 1) / count) * allTasks.length);
    const tasks = allTasks.slice(start, end);
    return {
      member: m.name,
      skills: m.skills && m.skills.length > 0 ? m.skills : ['Full Stack Development'],
      assignedTasks: tasks.map(t => ({ task: t, status: 'Not Started' })),
      reason: `Balanced task allocation across ${count} team member(s) based on available skills.`
    };
  });

  const basePct = Math.floor(100 / count);
  const workloadDistribution = members.map((m, idx) => ({
    member: m.name,
    percentage: idx === members.length - 1 ? 100 - basePct * (count - 1) : basePct
  }));

  return {
    projectTasks: {
      coreFeatures: ['Core Feature Development', 'User Interface', 'API Integration'],
      technicalTasks: ['Authentication & Authorization', 'Database Schema Design', 'State Management', 'Error Handling & Validation', 'Security'],
      deploymentTasks: ['Environment Configuration', 'Production Deployment', 'Demo Preparation']
    },
    assignments,
    workloadDistribution,
    executionOrder: [
      '1. Environment Setup & Database Schema Design',
      '2. Authentication & Authorization',
      '3. User Management & Profile',
      '4. Core Feature Backend APIs',
      '5. Frontend Pages & UI Components',
      '6. AI Feature Integration',
      '7. State Management & API Wiring',
      '8. Testing & Bug Fixes',
      '9. Production Deployment & Demo Preparation'
    ],
    criticalTasks: [
      'Authentication & Authorization (JWT)',
      'Core Feature Backend API Endpoints',
      'Frontend UI Components & Pages',
      'Production Deployment & Demo Preparation'
    ],
    recommendedFocus: [
      'End-to-end working demo loop',
      'Clean, polished UI for judge presentation',
      'AI integration as the key differentiator'
    ],
    warnings: [
      'Ensure all team members agree on the architecture before coding begins.',
      'Prioritize a working demo over feature completeness.',
      'AI integration may take longer than estimated — build a mock fallback.'
    ]
  };
};

/**
 * Generates a complete AI Task Plan using Qwen AI.
 * Behaves as Technical Architect + Engineering Manager + Hackathon Mentor.
 * Falls back to OpenRouter or Mock if needed.
 *
 * @param {string} contextString - Full project + team context string
 * @param {Array} members - Array of { name, skills } objects
 * @returns {Promise<object>} Parsed structured task plan JSON
 */
const generateTaskPlanWithAI = async (contextString, members) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!qwenKey && !openRouterKey) {
    console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock task plan.');
    return generateMockTaskPlan(contextString, members);
  }

  const memberList = members.map(m =>
    `- ${m.name}: ${(m.skills || []).join(', ') || 'No skills specified'}`
  ).join('\n');

  const prompt = `/no_think
You are an experienced Technical Architect, Engineering Manager, Hackathon Mentor, and Startup CTO.

You are helping a hackathon team break down their project into actionable tasks and assign them intelligently.

Your responsibilities:
1. Understand the FULL project scope — what is being built, what problem it solves.
2. Identify ALL implementation work required — including tasks NOT mentioned by the team (authentication, DB design, error handling, validation, deployment, env config, security, state management, testing, etc.).
3. Break tasks into: coreFeatures (user-facing features), technicalTasks (infrastructure/backend/frontend), deploymentTasks.
4. Assign each task to the most suitable team member based on their skills.
5. Balance workload fairly — no single person should get most tasks.
6. Create a realistic dependency-aware execution order.
7. Identify critical tasks that MUST be done for a successful demo.
8. Recommend high-impact features that will maximize judging score.
9. Warn about scope risks, missing skills, or timeline issues.

Skill Mapping:
- React / Vue / Angular -> Frontend tasks
- Node.js / Express / FastAPI -> Backend tasks
- MongoDB / PostgreSQL / MySQL -> Database tasks
- Python / TensorFlow / PyTorch / ML -> AI/ML tasks
- Figma / UI/UX Design -> Design tasks
- DevOps / Docker / AWS / CI/CD -> Deployment tasks
- Full Stack -> Frontend + Backend tasks

CRITICAL RULES:
- NEVER assign tasks based only on what the user explicitly listed as features.
- ALWAYS infer missing technical tasks: auth, routing, schema design, state management, error handling, validation, security, testing, deployment, etc.
- Every task is assigned to exactly ONE person.
- workloadDistribution percentages MUST sum to exactly 100.
- assignedTasks must be an array of plain strings (task names only).
- Return ONLY valid JSON. No markdown fences. No explanations. No thinking. Only raw JSON starting with {.

Required JSON format:
{
  "projectTasks": {
    "coreFeatures": ["string"],
    "technicalTasks": ["string"],
    "deploymentTasks": ["string"]
  },
  "assignments": [
    {
      "member": "string",
      "skills": ["string"],
      "assignedTasks": ["string"],
      "reason": "string"
    }
  ],
  "workloadDistribution": [
    {
      "member": "string",
      "percentage": number
    }
  ],
  "executionOrder": ["string"],
  "criticalTasks": ["string"],
  "recommendedFocus": ["string"],
  "warnings": ["string"]
}

Project Context:
${contextString}

Team Members and Skills:
${memberList}`;

  // 1. Try Qwen via Featherless
  if (qwenKey) {
    try {
      console.log(`Attempting AI task plan generation via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 60000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await qwenClient.chat.completions.create({
        model: 'Qwen/Qwen3.6-35B-A3B',
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 8000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      console.log(`Qwen task plan raw response length: ${responseText.length} chars`);
      const plan = cleanAndParseTaskPlan(responseText);
      validateTaskPlanCompleteness(plan, members);
      return plan;
    } catch (qwenError) {
      console.error('Qwen API call for task plan failed:', qwenError.message || qwenError);
      if (!openRouterKey) {
        throw new Error(`Qwen API error: ${qwenError.message || 'Unknown error'}`);
      }
      console.log('Falling back to OpenRouter for task plan...');
    }
  }

  // 2. Fallback: OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting AI task plan generation via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: 'qwen/qwen3.6-35b-a3b',
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 8000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      console.log(`OpenRouter task plan raw response length: ${responseText.length} chars`);
      const plan = cleanAndParseTaskPlan(responseText);
      validateTaskPlanCompleteness(plan, members);
      return plan;
    } catch (openRouterError) {
      console.error('OpenRouter API call for task plan failed:', openRouterError.message || openRouterError);
      throw new Error(`AI API failure: ${openRouterError.message || 'Failed to communicate with AI endpoint'}`);
    }
  }

  return generateMockTaskPlan(contextString, members);
};

module.exports = {
  analyzeTeamWithAI,
  analyzeProjectWithAI,
  chatWithMentorAI,
  generateTaskPlanWithAI
};
