const ConversationMemory = require('../../models/ConversationMemory');
const ConversationSummarizer = require('./ConversationSummarizer');

/**
 * MemoryManager
 * Manages conversation memories, extracting decisions (architecture, tech stack, milestones) 
 * from the assistant-user exchange and auto-summarizing history.
 */
class MemoryManager {
  /**
   * Fetches or initializes ConversationMemory for a project.
   * @param {string} projectId 
   * @returns {Promise<object>}
   */
  async getMemory(projectId) {
    if (!projectId) return null;
    let memory = await ConversationMemory.findOne({ projectId });
    if (!memory) {
      try {
        memory = new ConversationMemory({ projectId });
        await memory.save();
      } catch (err) {
        memory = await ConversationMemory.findOne({ projectId });
      }
    }
    return memory;
  }

  /**
   * Updates memory fields with new elements.
   * @param {string} projectId 
   * @param {object} updates 
   * @returns {Promise<object>}
   */
  async updateMemory(projectId, updates) {
    const memory = await this.getMemory(projectId);
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
  }

  /**
   * Extracts architectural and tech decisions from a mentor message exchange in the background.
   * @param {string} projectId 
   * @param {string} userMessage 
   * @param {string} aiResponse 
   * @param {function} executeFn - Reference to AIEngine executeAI to run prompts
   */
  async extractAndAddMemory(projectId, userMessage, aiResponse, executeFn) {
    try {
      const memory = await this.getMemory(projectId);
      if (!memory) return;

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
  "previousAiAdvice": ["string"],
  "currentBlockers": ["string"],
  "completedTasks": ["string"],
  "recentRecommendations": ["string"],
  "currentSprint": "string",
  "hackathonStage": "string",
  "githubStatus": "string",
  "currentImplementation": "string",
  "currentDebuggingSession": "string",
  "currentFeature": "string",
  "currentApis": ["string"],
  "currentDeploymentIssue": "string"
}`;

      let parsed = null;
      try {
        const responseJson = await executeFn({
          module: 'extractMentorMemory',
          userInput: extractionPrompt
        });
        parsed = typeof responseJson === 'object' ? responseJson : JSON.parse(responseJson);
      } catch (err) {
        console.warn('[MemoryManager] Extraction parsing failed:', err.message);
      }

      let updated = false;

      if (parsed) {
        [
          'architectureDecisions',
          'techStackDecisions',
          'projectMilestones',
          'previousAiAdvice',
          'currentBlockers',
          'completedTasks',
          'recentRecommendations'
        ].forEach(key => {
          if (parsed[key] && Array.isArray(parsed[key]) && parsed[key].length > 0) {
            const cleanEntries = parsed[key].filter(entry => entry && entry.trim().length > 5);
            if (cleanEntries.length > 0) {
              memory[key] = Array.from(new Set([...(memory[key] || []), ...cleanEntries]));
              updated = true;
            }
          }
        });

        [
          'currentImplementation',
          'currentDebuggingSession',
          'currentFeature',
          'currentDeploymentIssue',
          'currentSprint',
          'hackathonStage',
          'githubStatus'
        ].forEach(key => {
          if (parsed[key] !== undefined && typeof parsed[key] === 'string' && parsed[key].trim().length > 0) {
            memory[key] = parsed[key].trim();
            updated = true;
          }
        });

        if (parsed.currentApis && Array.isArray(parsed.currentApis) && parsed.currentApis.length > 0) {
          const cleanEntries = parsed.currentApis.filter(entry => entry && entry.trim().length > 2);
          memory.currentApis = Array.from(new Set([...(memory.currentApis || []), ...cleanEntries]));
          updated = true;
        }
      }

      // Auto-summarize
      try {
        const ProjectChat = require('../../models/ProjectChat');
        const messages = await ProjectChat.find({ projectId }).sort({ createdAt: -1 }).limit(10);
        
        if (messages && messages.length >= 4) {
          const sortedMsgs = messages.slice().reverse();
          const summary = await ConversationSummarizer.summarize(sortedMsgs);
          if (summary) {
            memory.summary = summary;
            updated = true;
          }
        }
      } catch (sumErr) {
        console.warn('[MemoryManager] Auto-summarization failed:', sumErr.message);
      }

      if (updated) {
        memory.lastUpdated = new Date();
        await memory.save();
        console.log(`[MemoryManager] Background memory updated successfully for project ${projectId}`);
      }
    } catch (err) {
      console.error('[MemoryManager] Background extraction critical error:', err.message);
    }
  }
}

module.exports = new MemoryManager();
