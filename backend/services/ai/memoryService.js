const ConversationMemory = require('../../models/ConversationMemory');
const geminiService = require('./geminiService');

/**
 * ConversationMemoryService
 * Maintains persistent AI memory including technical decisions, advice history,
 * milestones, and conversation summaries.
 */

/**
 * Fetches or initializes the ConversationMemory for a project.
 * @param {string} projectId - The project ID
 * @returns {Promise<object>} The ConversationMemory document
 */
const getMemory = async (projectId) => {
  if (!projectId) return null;
  let memory = await ConversationMemory.findOne({ projectId });
  if (!memory) {
    try {
      memory = new ConversationMemory({ projectId });
      await memory.save();
    } catch (err) {
      // In case of parallel creations or pre-existing in-memory structures
      memory = await ConversationMemory.findOne({ projectId });
    }
  }
  return memory;
};

/**
 * Updates memory fields with new elements.
 * @param {string} projectId - The project ID
 * @param {object} updates - Key-value updates to merge into memory
 * @returns {Promise<object>} The updated memory
 */
const updateMemory = async (projectId, updates) => {
  const memory = await getMemory(projectId);
  if (!memory) return null;

  Object.keys(updates).forEach(key => {
    if (Array.isArray(updates[key])) {
      const uniqueItems = Array.from(new Set([...(memory[key] || []), ...updates[key]]));
      memory[key] = uniqueItems;
    } else {
      memory[key] = updates[key];
    }
  });

  memory.lastUpdated = new Date();
  await memory.save();
  return memory;
};

/**
 * Extracts architecture, tech stack decisions, and advice in the background from a message exchange.
 * @param {string} projectId - The project ID
 * @param {string} userMessage - User's chat message
 * @param {string} aiResponse - AI's response text
 */
const extractAndAddMemory = async (projectId, userMessage, aiResponse) => {
  try {
    const memory = await getMemory(projectId);
    if (!memory) return;

    // Call Gemini to extract any technical decisions
    const extractionPrompt = `You are a conversation memory assistant for a hackathon AI mentor.
Given the latest user message and the AI mentor's response, extract:
1. Architecture Decisions (e.g., "Decided to use a microservices approach for image parsing").
2. Tech Stack Decisions (e.g., "Switched database from MongoDB to PostgreSQL").
3. Project Milestones (e.g., "Completed deployment configuration on Vercel").
4. AI Advice Accepted (e.g., "Accepted recommendation to freeze advanced features").

Input Message exchange:
User: "${userMessage}"
AI Response: "${aiResponse}"

Return ONLY a valid JSON object matching this schema:
{
  "architectureDecisions": ["string"],
  "techStackDecisions": ["string"],
  "projectMilestones": ["string"],
  "previousAiAdvice": ["string"]
}`;

    let parsed = null;
    try {
      const rawResult = await geminiService.executePrompt({
        contents: extractionPrompt,
        systemInstruction: 'You are a JSON-only conversation parser. Extract key decisions and return raw JSON matching the schema.',
        isJson: true,
        endpointName: 'memory_extraction'
      });
      parsed = JSON.parse(rawResult);
    } catch (geminiErr) {
      console.warn('[ConversationMemoryService] Gemini extraction failed or returned invalid JSON:', geminiErr.message);
    }

    let updated = false;

    if (parsed) {
      ['architectureDecisions', 'techStackDecisions', 'projectMilestones', 'previousAiAdvice'].forEach(key => {
        if (parsed[key] && Array.isArray(parsed[key]) && parsed[key].length > 0) {
          const cleanEntries = parsed[key].filter(entry => entry && entry.trim() && entry.length > 5);
          if (cleanEntries.length > 0) {
            memory[key] = Array.from(new Set([...(memory[key] || []), ...cleanEntries]));
            updated = true;
          }
        }
      });
    }

    // Auto summarize the conversation if message count is growing
    try {
      const ProjectChat = require('../../models/ProjectChat');
      const messages = await ProjectChat.find({ projectId }).sort({ createdAt: -1 }).limit(10);
      
      if (messages && messages.length > 0) {
        const conversationHistory = messages
          .map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.message}`)
          .reverse()
          .join('\n');
        
        const summaryPrompt = `Summarize this recent hackathon mentor conversation in 2 sentences. Highlight the main topic and decisions:
        
Conversation:
${conversationHistory}`;

        const rawSummary = await geminiService.executePrompt({
          contents: summaryPrompt,
          systemInstruction: 'Provide a concise 2-sentence summary of the conversation.',
          endpointName: 'memory_summarization'
        });

        if (rawSummary && rawSummary.trim()) {
          memory.summary = rawSummary.trim();
          updated = true;
        }
      }
    } catch (sumErr) {
      console.warn('[ConversationMemoryService] Conversation summarization failed:', sumErr.message);
    }

    if (updated) {
      memory.lastUpdated = new Date();
      await memory.save();
      console.log(`[ConversationMemoryService] Automatically updated memory details for project ${projectId}`);
    }
  } catch (err) {
    console.error('[ConversationMemoryService] extractAndAddMemory critical error:', err.message);
  }
};

module.exports = {
  getMemory,
  updateMemory,
  extractAndAddMemory
};
