const AIOrchestrator = require('./AIOrchestrator');
const AnalyticsService = require('./AnalyticsService');

/**
 * AIEngine
 * Backward-compatible facade for the centralized AI orchestrator.
 * Existing controllers and services keep calling executeAI, while all new
 * provider, prompt, validation, cache, metrics, and memory behavior lives in
 * AIOrchestrator.
 */
class AIEngine {
  /**
   * Executes AI request.
   * @param {object} params 
   * @param {string} params.projectId - MongoDB Project ID
   * @param {string} params.module - The AI feature module name
   * @param {any} params.userInput - The user inputs or payload for the prompt
   * @param {boolean} [params.bypassCache=false] - Force rebuild of context cache
   * @param {Array} [params.history=[]] - Chat conversation history logs
   * @param {Array} [params.members=[]] - Option list of members for splitting/stack
   * @returns {Promise<any>}
   */
  async executeAI({ projectId, module, userInput, bypassCache = false, history = [], members = [], metadata = {} }) {
    console.log(`[AIEngine] Delegating "${module}" request for project "${projectId}" to AIOrchestrator`);
    return AIOrchestrator.execute({ projectId, module, userInput, bypassCache, history, members, metadata });
  }

  /**
   * Exposes analytics summary.
   */
  getAnalyticsSummary() {
    return AnalyticsService.getSummary();
  }
}

module.exports = new AIEngine();
