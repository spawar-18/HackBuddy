const { OpenAI } = require('openai');

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-coder-32b-instruct';

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
  if (firstBrace === -1) {
    console.error('Failed to parse AI response: No JSON object found. Response:', responseText.substring(0, 500));
    throw new Error('Invalid AI JSON response: No JSON object found in response');
  }
  
  let cleanText = stripped.substring(firstBrace);
  const lastBrace = cleanText.lastIndexOf('}');
  if (lastBrace !== -1) {
    cleanText = cleanText.substring(0, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText.trim());
  } catch (parseErr) {
    try {
      console.log('Failed to parse team analysis response directly. Trying to repair truncated JSON...');
      const repaired = repairTruncatedJson(cleanText.trim());
      parsed = JSON.parse(repaired);
    } catch (repairErr) {
      console.error('Failed to parse AI response as JSON even after repair attempt. Raw response:', responseText);
      throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
    }
  }

  const requiredKeys = ['readinessScore', 'strengths', 'skillGaps', 'recommendedRoles'];
  const missingKeys = requiredKeys.filter(key => !(key in parsed));
  if (missingKeys.length > 0) {
    console.warn(`Warning: Missing required fields: ${missingKeys.join(', ')}. Supplying defaults.`);
    if (!('readinessScore' in parsed)) parsed.readinessScore = 5.0;
    if (!('strengths' in parsed)) parsed.strengths = [];
    if (!('skillGaps' in parsed)) parsed.skillGaps = [];
    if (!('recommendedRoles' in parsed)) parsed.recommendedRoles = [];
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

  // 1. Prioritize OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting deterministic Qwen team analysis via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 30000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 2000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseResponse(responseText);
    } catch (openRouterError) {
      console.error('OpenRouter API call failed:', openRouterError.message || openRouterError);
      console.log('Falling back to Mock team analysis...');
      return generateMockAnalysis(teamDataString);
    }
  }

  // 2. Try Qwen via Featherless (with lower timeout of 10s to prevent browser hangs)
  if (qwenKey) {
    try {
      console.log(`Attempting deterministic Qwen team analysis via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 10000,
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
        max_tokens: 2000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseResponse(responseText);
    } catch (qwenError) {
      console.error('Qwen API call failed:', qwenError.message || qwenError);
      console.log('Falling back to Mock team analysis...');
      return generateMockAnalysis(teamDataString);
    }
  }

  console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock analysis.');
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
  if (firstBrace === -1) {
    console.error('Failed to parse AI project review: No JSON object found. Response:', responseText.substring(0, 500));
    throw new Error('Invalid AI JSON response: No JSON object found in response');
  }
  
  let cleanText = stripped.substring(firstBrace);
  const lastBrace = cleanText.lastIndexOf('}');
  if (lastBrace !== -1) {
    cleanText = cleanText.substring(0, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText.trim());
  } catch (parseErr) {
    try {
      console.log('Failed to parse project review directly. Trying to repair truncated JSON...');
      const repaired = repairTruncatedJson(cleanText.trim());
      parsed = JSON.parse(repaired);
    } catch (repairErr) {
      console.error('Failed to parse AI project review response as JSON even after repair attempt. Raw response:', responseText);
      throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
    }
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
  // Extract hours from the context string (e.g., "Duration: 24 hours")
  const durationMatch = (projectContextString || '').match(/Duration:\s*(\d+)\s*hours?/i) || (projectContextString || '').match(/Duration:\s*(\d+)/i);
  const hours = durationMatch ? parseInt(durationMatch[1], 10) : 24;

  let executionStrategy = [];
  if (hours <= 12) {
    executionStrategy = [
      '1. Setup minimal database schemas and mockup endpoints immediately.',
      '2. Develop the absolute core feature flow on frontend and backend (freeze optional features).',
      '3. Deploy to production early (e.g. within 6 hours) to test hosting connectivity.',
      '4. Polish key presentation views and record a backup demo walkthrough.'
    ];
  } else if (hours <= 24) {
    executionStrategy = [
      '1. Database & Route Setup: Build schemas and core REST APIs (first 4 hours).',
      '2. AI Service Hookup: Connect LLM APIs and set up parser/repaired JSON parsing (hours 4-10).',
      '3. UI Development: Build responsive dashboard panels, lists, and loading indicators (hours 10-18).',
      '4. Integration, Testing, Deployment and demo pitch rehearsals (final 6 hours).'
    ];
  } else if (hours <= 48) {
    executionStrategy = [
      '1. Architecture Design & Setup: Establish DB schemas, routers, and test files (first 8 hours).',
      '2. Core API & State Sync: Implement complete controllers, team sync hooks, and validations (hours 8-20).',
      '3. Frontend Assembly & Custom Styling: Design premium glassmorphism layouts, lists, and forms (hours 20-36).',
      '4. Rigorous manual testing, deployments, git-sync verification, and demo day slide preparation (final 12 hours).'
    ];
  } else {
    executionStrategy = [
      '1. Specification & Framework Setup: Complete database schema designs and REST routes architectures (Day 1).',
      '2. Feature Implementation Phase: Implement APIs, backend services, and front-end interface layouts (Day 2).',
      '3. Verification & Optimization: Establish automated task verifiers, performance metrics, and caching (Day 3).',
      '4. Deployment, styling polish, and extensive judge-day presentation rehearsal (Day 4/Final).'
    ];
  }

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
    executionStrategy
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
* Tailor the "executionStrategy" list steps to the specified "Duration". If the duration is 24 hours, 36 hours, or 48 hours, output hourly milestone phases (e.g., "Hours 0-8: ...", "Hours 8-16: ...", "Hours 16-24: ...") instead of Days. Only use Day-based milestones (e.g., "Day 1", "Day 2") if the duration is 72 hours (3 days) or longer.
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

  // 1. Prioritize OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting deterministic Qwen project review via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 30000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 2000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseProjectReview(responseText);
    } catch (openRouterError) {
      console.error('OpenRouter API call for project review failed:', openRouterError.message || openRouterError);
      console.log('Falling back to Mock project review...');
      return generateMockProjectReview(projectContextString);
    }
  }

  // 2. Try Qwen via Featherless
  if (qwenKey) {
    try {
      console.log(`Attempting deterministic Qwen project review via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 10000,
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
        max_tokens: 2000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseProjectReview(responseText);
    } catch (qwenError) {
      console.error('Qwen API call for project review failed:', qwenError.message || qwenError);
      console.log('Falling back to Mock project review...');
      return generateMockProjectReview(projectContextString);
    }
  }

  console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock project review.');
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

  // 1. Prioritize OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting deterministic Qwen mentor chat via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 30000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1500,
      });

      return response.choices[0]?.message?.content || 'No response from mentor AI.';
    } catch (openRouterError) {
      console.error('OpenRouter API call for mentor chat failed:', openRouterError.message || openRouterError);
      console.log('Falling back to Mock mentor chat response...');
      return generateMockChatResponse(currentQuestion, projectContextString);
    }
  }

  // 2. Try Qwen via Featherless
  if (qwenKey) {
    try {
      console.log(`Attempting deterministic Qwen mentor chat via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 10000,
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
      console.log('Falling back to Mock mentor chat response...');
      return generateMockChatResponse(currentQuestion, projectContextString);
    }
  }

  console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock chat.');
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

  // 1. Prioritize OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting AI task plan generation via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 30000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 2500,
      });

      const responseText = response.choices[0]?.message?.content || '';
      console.log(`OpenRouter task plan raw response length: ${responseText.length} chars`);
      const plan = cleanAndParseTaskPlan(responseText);
      validateTaskPlanCompleteness(plan, members);
      return plan;
    } catch (openRouterError) {
      console.error('OpenRouter API call for task plan failed:', openRouterError.message || openRouterError);
      console.log('Falling back to Mock task plan...');
      return generateMockTaskPlan(contextString, members);
    }
  }

  // 2. Try Qwen via Featherless
  if (qwenKey) {
    try {
      console.log(`Attempting AI task plan generation via ${qwenBaseUrl} (QWEN_API)...`);
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 10000,
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
        max_tokens: 2500,
      });

      const responseText = response.choices[0]?.message?.content || '';
      console.log(`Qwen task plan raw response length: ${responseText.length} chars`);
      const plan = cleanAndParseTaskPlan(responseText);
      validateTaskPlanCompleteness(plan, members);
      return plan;
    } catch (qwenError) {
      console.error('Qwen API call for task plan failed:', qwenError.message || qwenError);
      console.log('Falling back to Mock task plan...');
      return generateMockTaskPlan(contextString, members);
    }
  }

  console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock task plan.');
  return generateMockTaskPlan(contextString, members);
};

const generateMockMarketplaceRecommendation = (requestDetails) => {
  const { requestType, requestedBy, targetUser, reason } = requestDetails;
  let recommendation = 'Approve';
  let confidenceScore = 85;
  let aiReason = `The requested ${requestType.toLowerCase()} seems reasonable to support team productivity.`;

  if (requestType === 'SWAP') {
    aiReason = `${requestedBy} and ${targetUser} are swapping tasks. This alignment matches skills profile and keeps workload balanced at equal shares.`;
    confidenceScore = 90;
  } else if (requestType === 'REASSIGNMENT') {
    aiReason = `Reassignment requested by ${requestedBy} due to: "${reason}". Task is marked as Available for other members to claim.`;
    confidenceScore = 80;
  } else if (requestType === 'COLLABORATOR') {
    aiReason = `Adding ${targetUser} as a collaborator to assist ${requestedBy} reduces delivery risk for critical MVP milestones.`;
    confidenceScore = 95;
  } else if (requestType === 'CLAIM') {
    aiReason = `${requestedBy} volunteered to claim this available task, increasing overall progress velocity.`;
    confidenceScore = 88;
  }

  return {
    recommendation,
    confidenceScore,
    reason: aiReason
  };
};

const getMarketplaceRecommendation = async (requestDetails) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const {
    task,
    requestType,
    requestedBy,
    targetUser = '',
    reason = '',
    teamSkills = {},
    currentWorkload = {},
    taskPriority = 'Medium',
    taskComplexity = 'Medium'
  } = requestDetails;

  const prompt = `Act as an AI Technical Manager, Engineering Lead, and Hackathon Mentor.
Evaluate this Task Marketplace request from a team member.

Your task is to analyze the request and provide a recommendation.
Evaluate the request based on:
1. Skill alignment of the requested/target users with the task.
2. Workload balance of the team.
3. Project completion risk.

Request Details:
- Request Type: ${requestType}
- Task in Question: "${task}"
- Requested By (Current Owner or Requester): ${requestedBy}
- Target Teammate (if swap/collaborator): ${targetUser}
- Requester Reason: "${reason}"
- Task Priority: ${taskPriority}
- Task Complexity: ${taskComplexity}

Team Context:
- Skills & Profiles:
${JSON.stringify(teamSkills, null, 2)}
- Current Workload Distribution:
${JSON.stringify(currentWorkload, null, 2)}

You MUST respond ONLY with a valid JSON object in this exact format, with no other text, markdown wrapper, or think tags:
{
  "recommendation": "Approve" or "Reject",
  "confidenceScore": number (between 0 and 100),
  "reason": "Clear explanation of your choice, referencing workload balance and skill matching"
}`;

  const parseResponse = (responseText) => {
    const stripped = stripThinkTags(responseText);
    const firstBrace = stripped.indexOf('{');
    const lastBrace = stripped.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      throw new Error('No JSON object found in AI response');
    }
    const cleanText = stripped.substring(firstBrace, lastBrace + 1).trim();
    const parsed = JSON.parse(cleanText);
    if (!parsed.recommendation || typeof parsed.confidenceScore !== 'number' || !parsed.reason) {
      throw new Error('Invalid JSON format from AI recommendation');
    }
    return parsed;
  };

  // 1. Prioritize OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting AI marketplace recommendation via OpenRouter...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 30000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });
      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 1500,
      });
      return parseResponse(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('OpenRouter recommendation failed:', err);
      console.log('Falling back to Mock marketplace recommendation...');
      return generateMockMarketplaceRecommendation(requestDetails);
    }
  }

  // 2. Try Qwen via Featherless
  if (qwenKey) {
    try {
      console.log('Attempting AI marketplace recommendation via Qwen API...');
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 10000,
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
        max_tokens: 1500,
      });
      return parseResponse(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('Qwen API recommendation failed:', err);
      console.log('Falling back to Mock marketplace recommendation...');
      return generateMockMarketplaceRecommendation(requestDetails);
    }
  }

  console.log('Using mock AI recommendation...');
  return generateMockMarketplaceRecommendation(requestDetails);
};

/**
 * Generates a mock tech stack consensus analysis for fallback
 */
const generateMockTechStackAnalysis = (proposal, votes, members) => {
  let approveCount = 0;
  let totalVotes = votes.length;
  let totalConfidence = 0;
  let techCount = 0;
  
  votes.forEach(v => {
    if (v.voteType === 'Approve') approveCount += 1.0;
    else if (v.voteType === 'Approve With Concerns') approveCount += 0.7;
    else approveCount += 0.1;
    
    if (v.confidenceScores) {
      const scores = v.confidenceScores instanceof Map ? Object.fromEntries(v.confidenceScores) : v.confidenceScores;
      Object.values(scores).forEach(score => {
        totalConfidence += Number(score);
        techCount++;
      });
    }
  });
  
  const consensusScore = totalVotes > 0 ? Math.round((approveCount / totalVotes) * 100) : 100;
  const avgConfidence = techCount > 0 ? (totalConfidence / techCount) : 8;
  const readinessScore = Math.round(avgConfidence * 10);
  
  return {
    readinessScore: readinessScore,
    consensusScore: consensusScore,
    strengths: [
      `Frontend choice of "${proposal.frontend || 'React'}" matches the general team skillset.`,
      `Vercel is selected for deployment, allowing rapid iterative updates during the hackathon.`
    ],
    risks: votes.some(v => v.voteType === 'Reject' || v.voteType === 'Approve With Concerns') ? [
      `Some team members raised concerns or rejects due to lack of experience with proposed backend/database.`
    ] : [
      `Learning curves for some selected tools might eat into actual feature development time.`
    ],
    recommendedChanges: votes.some(v => v.voteType === 'Reject') ? [
      `Switch database / backend technologies with low confidence to proposed alternatives.`
    ] : [
      `Ensure team initializes boilerplate configurations before the hackathon begins.`
    ],
    recommendedStack: {
      frontend: [proposal.frontend || 'React'],
      backend: [proposal.backend || 'Node.js'],
      database: [proposal.database || 'MongoDB'],
      ai: [proposal.ai || 'Featherless AI'],
      deployment: [proposal.deployment || 'Vercel']
    },
    reasoning: `The team has an average technology confidence of ${avgConfidence.toFixed(1)}/10. Consensus score is ${consensusScore}%. Team is mostly prepared, but low confidence on backend should be addressed.`,
    finalRecommendation: `Accept the stack but consider switching backend to Node.js / Express for speed.`
  };
};

/**
 * Clean and parse tech stack analysis response
 */
const cleanAndParseTechStackAnalysis = (responseText) => {
  const stripped = stripThinkTags(responseText);
  const firstBrace = stripped.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in AI response');
  }
  let cleanText = stripped.substring(firstBrace);
  const lastBrace = cleanText.lastIndexOf('}');
  if (lastBrace !== -1) {
    cleanText = cleanText.substring(0, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText.trim());
  } catch (parseErr) {
    try {
      console.warn('Failed to parse tech stack analysis response directly. Trying to repair...');
      const repaired = repairTruncatedJson(cleanText.trim());
      parsed = JSON.parse(repaired);
    } catch (repairErr) {
      console.error('Failed to parse AI tech stack analysis response as JSON even after repair. Raw response:', responseText);
      throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
    }
  }

  // Validate format
  if (typeof parsed.readinessScore !== 'number') parsed.readinessScore = 50;
  if (typeof parsed.consensusScore !== 'number') parsed.consensusScore = 50;
  if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
  if (!Array.isArray(parsed.risks)) parsed.risks = [];
  if (!Array.isArray(parsed.recommendedChanges)) parsed.recommendedChanges = [];
  if (!parsed.recommendedStack || typeof parsed.recommendedStack !== 'object') {
    parsed.recommendedStack = { frontend: [], backend: [], database: [], ai: [], deployment: [] };
  } else {
    ['frontend', 'backend', 'database', 'ai', 'deployment'].forEach(k => {
      if (!Array.isArray(parsed.recommendedStack[k])) {
        parsed.recommendedStack[k] = parsed.recommendedStack[k] ? [String(parsed.recommendedStack[k])] : [];
      }
    });
  }
  if (typeof parsed.reasoning !== 'string') parsed.reasoning = '';
  if (typeof parsed.finalRecommendation !== 'string') parsed.finalRecommendation = '';

  return parsed;
};

/**
 * Analyzes tech stack options, votes, and skills with AI
 */
const analyzeTechStackWithAI = async (proposalContext, teamContext, hackathonDuration, projectComplexity) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const prompt = `You are a Technical Architect, Hackathon Mentor, Engineering Manager, and Startup CTO.
Your goal is to perform a detailed Tech Stack Consensus Analysis for a hackathon team project.

Inputs:
1. Proposed Tech Stack:
- Frontend: ${proposalContext.proposal.frontend}
- Backend: ${proposalContext.proposal.backend}
- Database: ${proposalContext.proposal.database}
- AI/ML: ${proposalContext.proposal.ai}
- Deployment: ${proposalContext.proposal.deployment}

2. Team Members & Skills:
${teamContext}

3. Team Votes, Confidence Scores (1-10, where 1-3 is Beginner, 4-6 Intermediate, 7-8 Comfortable, 9-10 Expert), & Concerns/Suggested Alternatives:
${JSON.stringify(proposalContext.votes, null, 2)}

4. Project Context:
- Hackathon Duration: ${hackathonDuration}
- Project Complexity: ${projectComplexity}

Evaluation Criteria:
- Team Familiarity & Learning Curve (based on confidence scores & listed skills)
- Hackathon Time Constraints (is the stack too heavy for ${hackathonDuration}?)
- Skill Availability & Gaps
- Project Complexity vs execution speed
- Deployment Difficulty (e.g. AWS vs Vercel for this team)

Calculate:
- readinessScore: 0-100 (representing how capable the team is of building the project using the selected stack)
- consensusScore: 0-100 (overall team agreement. 0-50 high disagreement, 51-75 moderate, 76-100 strong agreement)

You MUST respond ONLY with a valid JSON object in this exact format, with no other text, markdown wrapper, or think tags:
{
  "readinessScore": number,
  "consensusScore": number,
  "strengths": ["string"],
  "risks": ["string"],
  "recommendedChanges": ["string"],
  "recommendedStack": {
    "frontend": ["string"],
    "backend": ["string"],
    "database": ["string"],
    "ai": ["string"],
    "deployment": ["string"]
  },
  "reasoning": "string",
  "finalRecommendation": "string"
}`;

  // 1. Prioritize OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting AI stack analysis via OpenRouter...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 30000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3050',
          'X-Title': 'HackBuddy',
        }
      });
      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 1500,
      });
      return cleanAndParseTechStackAnalysis(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('OpenRouter stack analysis failed:', err);
      console.log('Falling back to Mock tech stack consensus analysis...');
      return generateMockTechStackAnalysis(proposalContext.proposal, proposalContext.votes, proposalContext.members);
    }
  }

  // 2. Try Qwen via Featherless
  if (qwenKey) {
    try {
      console.log('Attempting AI stack analysis via Qwen API...');
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 10000,
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
        max_tokens: 1500,
      });
      return cleanAndParseTechStackAnalysis(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('Qwen API stack analysis failed:', err);
      console.log('Falling back to Mock tech stack consensus analysis...');
      return generateMockTechStackAnalysis(proposalContext.proposal, proposalContext.votes, proposalContext.members);
    }
  }

  console.warn('WARNING: Neither QWEN_API nor OPENROUTER_API_KEY is defined. Using mock stack analysis.');
  return generateMockTechStackAnalysis(proposalContext.proposal, proposalContext.votes, proposalContext.members);
};

/**
 * Generate a mock Hackathon Command Center AI analysis report.
 * @param {object} context - Hackathon context object
 * @returns {object} Mock report
 */
const generateMockCommandCenterReport = (context) => {
  const { projectDetails, timeRemaining, taskPlan } = context;
  const assignments = taskPlan?.assignments || [];
  const totalTasks = assignments.reduce((sum, a) => sum + (a.assignedTasks?.length || 0), 0);
  const completedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Completed')?.length || 0), 0);
  const blockedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Blocked')?.length || 0), 0);
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let overallStatus = 'On Track';
  let riskLevel = 'Low';
  if (pct < 25) { overallStatus = 'High Risk'; riskLevel = 'High'; }
  else if (pct < 50) { overallStatus = 'Slightly Behind'; riskLevel = 'Medium'; }
  else if (pct >= 80) { overallStatus = 'Ready For Demo'; }

  // Extract hours left to adapt the execution strategy dynamically
  const hoursLeftMatch = (timeRemaining || '').match(/(\d+)/);
  const hoursLeft = hoursLeftMatch ? parseInt(hoursLeftMatch[1], 10) : 24;

  let executionStrategy = [];
  if (hoursLeft <= 6) {
    executionStrategy = [
      'CRITICAL FREEZE: Implement absolutely no new features. Fix critical path bugs only.',
      'Demo Deployment: Deploy current stable branch to Vercel/Render immediately.',
      'Dry Run: Test the end-to-end user loop 3 times. Record a fallback video.',
      'Pitch Prep: Focus on problem statement impact and live demo setup.'
    ];
  } else if (hoursLeft <= 12) {
    executionStrategy = [
      'Feature Freeze: Lock features and focus on database and API integration.',
      'Integration & Testing: Test API connectivity and mock fallback database connections.',
      'Basic Deployment: Build production bundles and deploy early version to staging.',
      'UI Refinement: Polishing alignments, styles, and dashboard metrics.'
    ];
  } else if (hoursLeft <= 24) {
    executionStrategy = [
      'Backend MVP Completion: Finalize database controllers and github API services.',
      'Frontend Layout & Hook Integration: Bind API endpoints to client components.',
      'Core Feature Validation: Verify automated task parsing and consensus rules.',
      'Freeze, Polish & Pitch Prep: Clean up code and prepare pitch materials.'
    ];
  } else {
    executionStrategy = [
      'Core Architecting: Finalize database models, router endpoints, and third-party integrations.',
      'Iterative Building: Team splits tasks across database, APIs, and React interfaces.',
      'Testing & Verification: Set up unit tests, code verification scripts, and lint checkups.',
      'Polish & UI Refinements: Polish UI micro-animations, glassmorphism transitions, and demo slides.'
    ];
  }

  return {
    overallStatus,
    riskLevel,
    completionPrediction: `Based on current velocity, the team is ${pct}% complete with ${timeRemaining}. ${
      pct >= 70 ? 'On track for a successful demo.' :
      pct >= 40 ? 'Focus is required on critical path tasks.' :
      'Significant effort needed — consider scope reduction.'
    }`,
    currentFocus: [
      `Complete remaining ${totalTasks - completedTasks} pending tasks`,
      'Finalize core MVP features before adding extras',
      'Prepare demo environment and test all user flows',
    ].filter(Boolean),
    tasksToPostpone: blockedTasks > 0 ? [
      'Any non-critical nice-to-have features',
      'Advanced analytics and reporting dashboards',
      'Third-party integrations that are not core to the demo'
    ] : [],
    reasoning: `The team has completed ${completedTasks} of ${totalTasks} tasks (${pct}%). ${
      blockedTasks > 0 ? `There are ${blockedTasks} blocked tasks that need immediate attention.` : 'No blocked tasks detected.'
    } Prioritize the critical path to ensure a working demo.`,
    judgePreparationTips: [
      'Lead with the problem statement and quantify the impact clearly',
      'Demonstrate a working end-to-end user flow, not just individual features',
      'Prepare answers for: "Why this approach?" and "What would you build next?"',
      'Have a backup demo video in case of live demo technical issues',
    ],
    executionStrategy
  };
};

/**
 * Analyzes hackathon progress and generates AI command center report.
 * Falls back to OpenRouter, then Qwen, then mock.
 * @param {object} context - { projectDetails, finalTechStack, teamSkills, taskPlan, timeRemaining, projectReview, marketplaceActivity, previousAlerts }
 * @returns {Promise<object>} Parsed structured AI report
 */
const analyzeHackathonCommandCenterWithAI = async (context) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const { projectDetails, finalTechStack, teamSkills, taskPlan, timeRemaining, previousAlerts } = context;

  // Summarise task progress for prompt
  const assignments = taskPlan?.assignments || [];
  const totalTasks = assignments.reduce((sum, a) => sum + (a.assignedTasks?.length || 0), 0);
  const completedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Completed')?.length || 0), 0);
  const blockedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Blocked')?.length || 0), 0);
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const memberSummary = Object.entries(teamSkills || {})
    .map(([name, skills]) => `- ${name}: ${(skills || []).join(', ') || 'No skills listed'}`)
    .join('\n');

  const prompt = `You are an AI Hackathon Command Center acting as Engineering Manager, Technical Lead, and Mentor.

Project: ${projectDetails?.projectName || 'Unknown'}
Problem: ${projectDetails?.problemStatement || 'N/A'}
Features: ${(projectDetails?.featuresToBuild || []).join(', ') || 'N/A'}
Tech Stack: ${JSON.stringify(finalTechStack || {})}
Time Remaining: ${timeRemaining}
Task Progress: ${completedTasks}/${totalTasks} completed (${pct}%), ${blockedTasks} blocked
Team Members & Skills:
${memberSummary}
Previous Alerts: ${(previousAlerts || []).join('; ') || 'None'}

Analyze and provide a JSON command center report.

Rules:
- Be specific to this project, not generic
- Consider the time remaining critically
- Identify real risks based on task progress
- Suggest concrete scope cuts if needed
- Return ONLY valid JSON

Required Format:
{
  "overallStatus": "On Track" | "Slightly Behind" | "High Risk" | "Critical" | "Ready For Demo",
  "riskLevel": "Low" | "Medium" | "High" | "Critical",
  "completionPrediction": "string (1-2 sentences on whether they will finish)",
  "currentFocus": ["string", "string", "string"],
  "tasksToPostpone": ["string"],
  "reasoning": "string (2-3 sentences explaining the assessment)",
  "judgePreparationTips": ["string", "string", "string"],
  "executionStrategy": ["string (step-by-step strategy adapted to the time remaining and hackathon configuration)"]
}`;

  const cleanAndParseCommandCenterReport = (responseText) => {
    const stripped = stripThinkTags(responseText);
    const firstBrace = stripped.indexOf('{');
    if (firstBrace === -1) throw new Error('No JSON found in command center AI response');
    let cleanText = stripped.substring(firstBrace);
    const lastBrace = cleanText.lastIndexOf('}');
    if (lastBrace !== -1) cleanText = cleanText.substring(0, lastBrace + 1);
    let parsed;
    try {
      parsed = JSON.parse(cleanText.trim());
    } catch (e) {
      const repaired = repairTruncatedJson(cleanText.trim());
      parsed = JSON.parse(repaired);
    }
    // Ensure required fields exist
    if (!parsed.overallStatus) parsed.overallStatus = 'On Track';
    if (!parsed.riskLevel) parsed.riskLevel = 'Medium';
    if (!parsed.completionPrediction) parsed.completionPrediction = 'Analysis inconclusive.';
    if (!Array.isArray(parsed.currentFocus)) parsed.currentFocus = [];
    if (!Array.isArray(parsed.tasksToPostpone)) parsed.tasksToPostpone = [];
    if (!parsed.reasoning) parsed.reasoning = '';
    if (!Array.isArray(parsed.judgePreparationTips)) parsed.judgePreparationTips = [];
    if (!Array.isArray(parsed.executionStrategy)) parsed.executionStrategy = [];
    return parsed;
  };

  // 1. Try OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting Command Center AI analysis via OpenRouter...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 45000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });
      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 1500,
      });
      return cleanAndParseCommandCenterReport(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('OpenRouter Command Center AI failed:', err.message || err);
      console.log('Falling back to Qwen for Command Center analysis...');
    }
  }

  // 2. Try Qwen
  if (qwenKey) {
    try {
      console.log('Attempting Command Center AI analysis via Qwen...');
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
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 1500,
      });
      return cleanAndParseCommandCenterReport(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('Qwen Command Center AI failed:', err.message || err);
      console.log('Falling back to mock Command Center report...');
    }
  }

  console.warn('WARNING: No AI API key available. Using mock Command Center report.');
  return generateMockCommandCenterReport(context);
};

/**
 * Clean up and parse the AI repository analysis response text as JSON.
 * @param {string} responseText - Text returned by the model
 * @returns {object} Parsed JSON analysis
 */
const cleanAndParseRepoAnalysis = (responseText) => {
  const stripped = stripThinkTags(responseText);
  const firstBrace = stripped.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in repo analysis AI response');
  }
  let cleanText = stripped.substring(firstBrace);
  const lastBrace = cleanText.lastIndexOf('}');
  if (lastBrace !== -1) {
    cleanText = cleanText.substring(0, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText.trim());
  } catch (err) {
    try {
      const repaired = repairTruncatedJson(cleanText.trim());
      parsed = JSON.parse(repaired);
    } catch (e) {
      console.error('Failed to parse AI repository analysis response as JSON even after repair. Raw response:', responseText);
      throw new Error('Invalid AI JSON response for repository analysis');
    }
  }

  // Ensure all keys required by UI exist
  if (!parsed.repositoryHealth) parsed.repositoryHealth = 'Healthy';
  if (!parsed.developmentStatus) parsed.developmentStatus = 'Active';
  if (!parsed.documentationStatus) parsed.documentationStatus = 'Good';
  if (!parsed.testingStatus) parsed.testingStatus = 'No tests detected';
  if (!parsed.deploymentStatus) parsed.deploymentStatus = 'Missing configuration';
  if (!Array.isArray(parsed.inactiveMembers)) parsed.inactiveMembers = [];
  if (!Array.isArray(parsed.missingComponents)) parsed.missingComponents = [];
  if (!Array.isArray(parsed.repositoryWarnings)) parsed.repositoryWarnings = [];
  if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];
  if (!parsed.reasoning) parsed.reasoning = 'No reasoning summary provided.';

  return parsed;
};

/**
 * Generate a context-aware fallback repository analysis if keys are missing/failed.
 */
const generateFallbackRepoAnalysis = (context) => {
  const { healthStatus, healthScore, hasReadme, hasTestFiles, hasDeployment } = context;
  return {
    repositoryHealth: healthStatus || 'Healthy',
    developmentStatus: 'Active',
    documentationStatus: hasReadme ? 'Good (README found)' : 'Missing README',
    testingStatus: hasTestFiles ? 'Tests detected' : 'No tests found',
    deploymentStatus: hasDeployment ? 'Deployment configured' : 'Missing configuration',
    inactiveMembers: [],
    missingComponents: [],
    repositoryWarnings: [
      !hasReadme && 'README file is missing from repository.',
      !hasTestFiles && 'No test files detected in repository tree.',
      !hasDeployment && 'No deployment configurations found (Dockerfile, vercel.json, etc.).'
    ].filter(Boolean),
    recommendations: [
      'Set up a solid README to guide pitch judges.',
      'Add test scripts and setup a basic test suite to improve score.',
      'Configure production deployment setups early to prevent late delivery issues.'
    ],
    reasoning: 'Repository scanned successfully. Computed metrics based on repository metadata and file indicators.'
  };
};

/**
 * Analyzes repository structure, README, package.json dependencies, and code files using Qwen/Gemini.
 * Performs a code-aware assessment of feature completeness and member contributions.
 * @param {object} context - Repository and project context details
 * @returns {Promise<object>} Structured repository analysis
 */
const analyzeGitHubRepositoryWithAI = async (context) => {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const {
    projectDetails,
    finalTechStack,
    taskPlan,
    timeRemaining,
    commitSummary,
    contributors,
    languages,
    hasReadme,
    hasTestFiles,
    hasDeployment,
    healthScore,
    healthStatus,
    completedTasks,
    totalTasks,
    previousAiRecommendations,
    tree = [],
    readmeContent = '',
    packageJsonContent = '',
    entrypointCodeContents = []
  } = context;

  // Format file structure
  const formattedTree = tree
    .map(f => `- ${f.path} (${f.type === 'tree' ? 'Directory' : 'File'})`)
    .slice(0, 150)
    .join('\n') || 'No file tree cached';

  // Format code snippets
  const formattedCodeSnippets = (entrypointCodeContents || [])
    .map(file => `### File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``)
    .join('\n\n') || 'No code snippets fetched';

  // Format languages
  const formattedLanguages = Object.entries(languages || {})
    .map(([lang, bytes]) => `${lang}: ${bytes} bytes`)
    .join(', ') || 'Unknown';

  // Format contributors
  const formattedContributors = (contributors || [])
    .map(c => `- ${c.name} (${c.commits || 0} commits, ${c.percentage || 0}%)`)
    .join('\n') || 'None';

  // Format task assignments
  const assignments = taskPlan?.assignments || [];
  const formattedTasks = assignments
    .map(a => `- Member: ${a.member}\n  Assigned Tasks: ${(a.assignedTasks || []).map(t => `[${t.status}] ${t.task}`).join(', ')}`)
    .join('\n') || 'No tasks assigned';

  const prompt = `You are HackBuddy Repository Intelligence Analyzer.
You act as a senior software architect, technical reviewer, and hackathon mentor.
Your goal is to parse the connected repository structure, dependencies, README, and code contents to determine the exact state of implementation.

Compare the planned task lists, user requirements, and technical scope against what is ACTUALLY in the repository.

INPUTS:
1. PROJECT DESCRIPTION:
- Name: ${projectDetails?.projectName || 'N/A'}
- Problem Statement: ${projectDetails?.problemStatement || 'N/A'}
- Features To Build: ${(projectDetails?.featuresToBuild || []).join(', ') || 'N/A'}
- Planned Tech Stack: ${JSON.stringify(finalTechStack || {})}

2. TEAM & TASK PLAN STATUS:
- Tasks & Statuses:
${formattedTasks}
- Scheduled Duration / Progress: ${completedTasks}/${totalTasks} tasks completed. Time remaining: ${timeRemaining}

3. GIT HUB METRICS & REPO HEALTH:
- Languages: ${formattedLanguages}
- Contributor Commits:
${formattedContributors}
- Raw Health Indicators: README present: ${hasReadme}, Tests present: ${hasTestFiles}, Deployment Config: ${hasDeployment}

4. FILE STRUCTURE & TREE (MAX 150 files):
${formattedTree}

5. PACKAGE DEPENDENCIES (package.json contents):
${packageJsonContent || 'package.json not detected'}

6. README FILE CONTENT:
${readmeContent || 'README.md not detected or empty'}

7. KEY ENTRYPOINT CODE SNIPPETS:
${formattedCodeSnippets}

EVALUATION DIRECTIONS:
1. Examine if the technologies in package.json/code match the finalTechStack and features.
2. Determine which features or components from the "Features To Build" list are missing based on the file tree and code snippets (put them in "missingComponents").
3. Determine if any team member is "inactive" in the repository (e.g. they are assigned tasks in the task plan, but have 0 commits/contributions in the contributor summary list). Add their names to the "inactiveMembers" array.
4. Detect specific warnings (e.g., repository has no commits from a member, no tests, missing environment config, API keys committed in code, no deployment configs, or no commits in the last 12 hours).
5. Generate repositoryHealth: "Excellent", "Healthy", "Needs Attention", or "Critical".
6. Generate developmentStatus: "Active", "Slow Progress", "Stalled", or "Ready For Demo".
7. Provide documentationStatus (e.g., "Good README", "Incomplete docs"), testingStatus (e.g., "Jest configured", "No tests found"), and deploymentStatus (e.g., "Vercel configured", "Missing config").
8. Provide actionable technical recommendations and a reasoning summary.

You MUST respond ONLY with a valid JSON object in this exact format, with no other text, markdown wrapper, or thinking tags:
{
  "repositoryHealth": "Excellent" | "Healthy" | "Needs Attention" | "Critical",
  "developmentStatus": "Active" | "Slow Progress" | "Stalled" | "Ready For Demo",
  "documentationStatus": "string",
  "testingStatus": "string",
  "deploymentStatus": "string",
  "inactiveMembers": ["string"],
  "missingComponents": ["string"],
  "repositoryWarnings": ["string"],
  "recommendations": ["string"],
  "reasoning": "string"
}
`;

  // Parse helper
  const parseResult = (responseText) => {
    return cleanAndParseRepoAnalysis(responseText);
  };

  // 1. Try OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting AI repository analysis via OpenRouter (OPENROUTER_API_KEY)...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 45000,
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'HackBuddy',
        }
      });

      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 2000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return parseResult(responseText);
    } catch (err) {
      console.error('OpenRouter repository analysis failed:', err.message || err);
      console.log('Falling back to Qwen for repository analysis...');
    }
  }

  // 2. Try Qwen
  if (qwenKey) {
    try {
      console.log(`Attempting AI repository analysis via Qwen at ${qwenBaseUrl}...`);
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
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond with raw JSON only. No explanations, no markdown, no thinking.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        top_p: 0.1,
        max_tokens: 2000,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return parseResult(responseText);
    } catch (err) {
      console.error('Qwen repository analysis failed:', err.message || err);
    }
  }

  console.warn('WARNING: No AI keys available. Generating fallback analysis.');
  return generateFallbackRepoAnalysis(context);
};

module.exports = {
  analyzeTeamWithAI,
  analyzeProjectWithAI,
  chatWithMentorAI,
  generateTaskPlanWithAI,
  getMarketplaceRecommendation,
  analyzeTechStackWithAI,
  analyzeHackathonCommandCenterWithAI,
  analyzeGitHubRepositoryWithAI
};

