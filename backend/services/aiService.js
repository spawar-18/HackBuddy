const { OpenAI } = require('openai');

/**
 * Clean up and parse the AI response text as JSON
 * @param {string} responseText - Text returned by the model
 * @returns {object} Parsed JSON analysis
 */
const cleanAndParseResponse = (responseText) => {
  // Clean up potential markdown formatting (e.g. ```json ... ```)
  const cleanText = responseText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseErr) {
    console.error('Failed to parse AI response as JSON:', responseText);
    throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
  }

  // Validate response structure (excluding suggestedProjects and recommendations)
  const requiredKeys = ['readinessScore', 'strengths', 'skillGaps', 'recommendedRoles'];
  const missingKeys = requiredKeys.filter(key => !(key in parsed));
  if (missingKeys.length > 0) {
    throw new Error(`Invalid AI JSON response: Missing required fields: ${missingKeys.join(', ')}`);
  }

  // Validate types and constraints
  if (typeof parsed.readinessScore !== 'number' || parsed.readinessScore < 1 || parsed.readinessScore > 10) {
    parsed.readinessScore = 5.0; // Fail-safe default
  }

  if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
  if (!Array.isArray(parsed.skillGaps)) parsed.skillGaps = [];
  if (!Array.isArray(parsed.recommendedRoles)) parsed.recommendedRoles = [];

  return parsed;
};

/**
 * Analyzes team readiness and skills using Qwen/Qwen3.6-35B-A3B.
 * First, it attempts to use QWEN_API with QWEN_BASE_URL (Featherless.ai gateway).
 * If that fails (due to key/network issues), it automatically falls back
 * to using OPENROUTER_API_KEY with OpenRouter.
 * 
 * Uses deterministic settings (temperature: 0, top_p: 0.1) to ensure stability.
 * 
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

  // 1. Attempt Qwen via Featherless API using QWEN_API & QWEN_BASE_URL
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
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        top_p: 0.1,
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

  // 2. Fallback: Attempt OpenRouter using OPENROUTER_API_KEY
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
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        top_p: 0.1,
      });

      const responseText = response.choices[0]?.message?.content || '';
      return cleanAndParseResponse(responseText);
    } catch (openRouterError) {
      console.error('OpenRouter API call failed:', openRouterError.message || openRouterError);
      throw new Error(`AI API failure: ${openRouterError.message || 'Failed to communicate with AI endpoint'}`);
    }
  }

  // Fallback mock (failsafe)
  return generateMockAnalysis(teamDataString);
};

/**
 * Generates mock team analysis for testing/fallback (excluding suggestedProjects & recommendations)
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
  
  // Custom mock mapping roles based on rules
  const recommendedRoles = finalMembers.map((member) => {
    return {
      member,
      role: 'Full Stack Developer' // Default mock role matching Guidelines
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
  const cleanText = responseText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseErr) {
    console.error('Failed to parse AI project review response as JSON:', responseText);
    throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
  }

  // Set default fallbacks if missing or of invalid type
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
 * Analyzes project feasibility, risks, features alignment, missing skills, etc.,
 * using Qwen/Qwen3.6-35B-A3B.
 * Falls back to OpenRouter or Mock if needed.
 * 
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

  // 1. Attempt Qwen via Featherless API using QWEN_API & QWEN_BASE_URL
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
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        top_p: 0.1,
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

  // 2. Fallback: Attempt OpenRouter using OPENROUTER_API_KEY
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
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        top_p: 0.1,
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
 * Supports OpenAI/Featherless client with OpenRouter fallback.
 * 
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

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  // Map history (role can be 'user' or 'assistant')
  history.forEach(h => {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.message
    });
  });

  messages.push({
    role: 'user',
    content: currentQuestion
  });

  // 1. Attempt Qwen via Featherless API using QWEN_API & QWEN_BASE_URL
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
        temperature: 0.2, // slightly higher temperature for conversational flow
        top_p: 0.9,
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

  // 2. Fallback: Attempt OpenRouter using OPENROUTER_API_KEY
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
      });

      return response.choices[0]?.message?.content || 'No response from mentor AI.';
    } catch (openRouterError) {
      console.error('OpenRouter API call for mentor chat failed:', openRouterError.message || openRouterError);
      throw new Error(`AI API failure: ${openRouterError.message || 'Failed to communicate with AI endpoint'}`);
    }
  }

  return generateMockChatResponse(currentQuestion, projectContextString);
};

module.exports = {
  analyzeTeamWithAI,
  analyzeProjectWithAI,
  chatWithMentorAI
};
