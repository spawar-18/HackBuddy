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

const AIEngine = require('./ai/AIEngine');

/**
 * Run task verification via LLM.
 * @param {object} context - Enriched task & github context
 * @returns {Promise<object>} Verification JSON response
 */
const verifyTaskWithAI = async (context) => {
  const projectId = context?.projectDetails?._id || context?.projectId;
  
  try {
    console.log('Attempting AI task verification via centralized AIEngine...');
    const result = await AIEngine.executeAI({
      projectId,
      module: 'verifyTaskWithAI',
      userInput: context
    });
    return result;
  } catch (err) {
    console.error('AI task verification failed in AIEngine, returning mock:', err.message);
    return generateMockVerification(context);
  }
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
