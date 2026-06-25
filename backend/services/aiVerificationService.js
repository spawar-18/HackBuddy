const { OpenAI } = require('openai');

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

/**
 * Strip Qwen3 <think>...</think> reasoning blocks from AI response text.
 */
const stripThinkTags = (text) => {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '').trim();
  return cleaned;
};

/**
 * Repair truncated JSON.
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

  let repaired = jsonStr;
  if (inString) repaired += '"';
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }

  return repaired;
};

/**
 * Run task verification via LLM.
 * @param {object} context - Enriched task & github context
 * @returns {Promise<object>} Verification JSON response
 */
const verifyTaskWithAI = async (context) => {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';

  const {
    projectDetails,
    taskDetails,
    gitHubContext
  } = context;

  const commitsStr = (gitHubContext?.recentCommits || []).map(c => 
    `- [${c.sha?.slice(0, 7)}] "${c.message}" by ${c.author} at ${c.date}`
  ).join('\n') || 'None';

  const changedFilesStr = (gitHubContext?.changedFiles || []).join('\n') || 'None';
  const modifiedFoldersStr = (gitHubContext?.modifiedFolders || []).join('\n') || 'None';
  
  const repoTreeStr = (gitHubContext?.tree || []).map(f => 
    `- ${f.path} (${f.type})`
  ).slice(0, 100).join('\n') || 'None'; // limit to top 100 files to avoid token overflow

  const prompt = `You are an AI Task Verification Engine.
Your job is to determine whether a completed task has evidence of implementation in the connected GitHub repository.

Do NOT evaluate code correctness. Your only responsibility is to determine implementation confidence based on the evidence provided below.

PROJECT CONTEXT:
- Problem: ${projectDetails.problemStatement}
- Features: ${(projectDetails.featuresToBuild || []).join(', ')}
- Tech Stack: ${JSON.stringify(projectDetails.finalTechStack || {})}

TASK TO VERIFY:
- Title: ${taskDetails.taskName}
- Description: ${taskDetails.taskDescription || 'No description provided'}
- Priority: ${taskDetails.taskPriority || 'Medium'}
- Assigned To: ${taskDetails.memberName}

GITHUB REPOSITORY ACTIVITY:
- Repository: ${gitHubContext?.repositoryName || 'N/A'}
- Repository Health Score: ${gitHubContext?.repositoryHealthScore || 0}/100
- README Status: ${gitHubContext?.hasReadme ? 'Present' : 'Missing'}
- Testing Status: ${gitHubContext?.hasTests ? 'Test files detected' : 'No tests found'}
- Deployment Status: ${gitHubContext?.hasDeployment ? 'Deployment config found' : 'No deployment config'}

RECENT COMMITS & MESSAGES:
${commitsStr}

RECENTLY CHANGED FILES:
${changedFilesStr}

RECENTLY MODIFIED FOLDERS:
${modifiedFoldersStr}

REPOSITORY STRUCTURE (TOP LEVEL):
${repoTreeStr}

INSTRUCTIONS:
1. Compare the Task Title and Description against the Commits, Changed Files, and Repository Structure.
2. Determine if there is sufficient evidence that the task was actually implemented.
3. Compute a Verification Confidence percentage (0-100):
   - >= 80%: Verified (Strong evidence like specific files matching the task description, clear commit messages)
   - 50-79%: Partially Verified (Likely implemented, partial evidence, files or commits are relevant but not completely specific)
   - 35-49%: Needs Manual Review (Unclear or weak correlation, name similarity but low evidence)
   - < 35%: Cannot Verify (No evidence, wrong files, or task marked complete but no related commits/files found)
4. Populate "matchedFiles" and "matchedCommits" arrays with matching evidence.
5. Return ONLY a valid JSON object. No explanations, no thinking tags, no markdown blocks.

JSON Output Schema:
{
  "verificationStatus": "Verified" | "Partially Verified" | "Cannot Verify" | "Needs Manual Review",
  "confidence": number,
  "matchedFiles": ["string"],
  "matchedCommits": ["string (shas)"],
  "reasoning": "string (explain why the verification result was chosen in 2-3 sentences)",
  "missingEvidence": ["string (what commits or files would make this verification stronger)"],
  "recommendation": "string (next steps for the developer)"
}`;

  const parseResult = (responseText) => {
    const stripped = stripThinkTags(responseText);
    const firstBrace = stripped.indexOf('{');
    if (firstBrace === -1) throw new Error('No JSON object found in AI response');
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

    // Sanitize and ensure correct values
    const statusMap = {
      'Verified': 'Verified',
      'Partially Verified': 'Partially Verified',
      'Cannot Verify': 'Cannot Verify',
      'Needs Manual Review': 'Needs Manual Review'
    };
    parsed.verificationStatus = statusMap[parsed.verificationStatus] || 'Needs Manual Review';
    parsed.confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
    if (!Array.isArray(parsed.matchedFiles)) parsed.matchedFiles = [];
    if (!Array.isArray(parsed.matchedCommits)) parsed.matchedCommits = [];
    if (!parsed.reasoning) parsed.reasoning = 'No reasoning provided.';
    if (!Array.isArray(parsed.missingEvidence)) parsed.missingEvidence = [];
    if (!parsed.recommendation) parsed.recommendation = 'No recommendation provided.';

    return parsed;
  };

  // 1. Try OpenRouter
  if (openRouterKey) {
    try {
      console.log('Attempting AI task verification via OpenRouter...');
      const openrouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        timeout: 25000,
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
        max_tokens: 1000,
      });
      return parseResult(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('OpenRouter task verification failed:', err.message || err);
    }
  }

  // 2. Try Qwen
  if (qwenKey) {
    try {
      console.log('Attempting AI task verification via Qwen...');
      const qwenClient = new OpenAI({
        baseURL: qwenBaseUrl,
        apiKey: qwenKey,
        timeout: 15000,
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
        max_tokens: 1000,
      });
      return parseResult(response.choices[0]?.message?.content || '');
    } catch (err) {
      console.error('Qwen task verification failed:', err.message || err);
    }
  }

  console.warn('WARNING: No AI API key available for task verification. Generating mock verification.');
  return generateMockVerification(context);
};

/**
 * Fallback mock verification builder.
 */
const generateMockVerification = (context) => {
  const { taskDetails, gitHubContext } = context;
  const taskNameLower = taskDetails.taskName.toLowerCase();
  const commits = gitHubContext?.recentCommits || [];
  const changedFiles = gitHubContext?.changedFiles || [];

  // Match commits or files based on simple keywords
  const keywords = taskNameLower.split(/\s+/).filter(w => w.length > 3);
  const matchedCommits = commits
    .filter(c => keywords.some(kw => c.message.toLowerCase().includes(kw)))
    .map(c => c.sha);

  const matchedFiles = changedFiles.filter(f => 
    keywords.some(kw => f.toLowerCase().includes(kw))
  );

  let verificationStatus = 'Cannot Verify';
  let confidence = 0;
  let reasoning = '';
  let recommendations = '';

  if (matchedCommits.length > 0 && matchedFiles.length > 0) {
    verificationStatus = 'Verified';
    confidence = 90;
    reasoning = `Strong evidence found. ${matchedCommits.length} related commits and ${matchedFiles.length} matching files detected.`;
    recommendations = 'Task implementation is verified. Proceed to testing and deployment phases.';
  } else if (matchedCommits.length > 0 || matchedFiles.length > 0) {
    verificationStatus = 'Partially Verified';
    confidence = 65;
    reasoning = `Partial evidence found. ${matchedCommits.length || matchedFiles.length} commits/files match task keywords, but code structures are not fully specific.`;
    recommendations = 'Add more descriptive commit messages or ensure all relevant files are fully pushed.';
  } else {
    verificationStatus = 'Cannot Verify';
    confidence = 20;
    reasoning = 'No related files or commits could be matched to the task description. The repository does not show active changes matching the task.';
    recommendations = 'Ensure all development work is committed and pushed under messages matching the task title.';
  }

  return {
    verificationStatus,
    confidence,
    matchedFiles,
    matchedCommits,
    reasoning,
    missingEvidence: matchedFiles.length === 0 ? ['Specific implementation files matching the task keywords'] : [],
    recommendation: recommendations
  };
};

module.exports = {
  verifyTaskWithAI
};
