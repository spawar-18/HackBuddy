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

module.exports = {
  analyzeTeamWithAI
};
