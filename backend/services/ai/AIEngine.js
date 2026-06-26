const ContextBuilder = require('./ContextBuilder');
const PromptManager = require('./PromptManager');
const AIProviderManager = require('./AIProviderManager');
const ResponseValidator = require('./responseValidator');
const FallbackManager = require('./FallbackManager');
const MemoryManager = require('./MemoryManager');
const AnalyticsService = require('./AnalyticsService');

/**
 * AIEngine
 * The centralized AI engine representing the sole entry point for AI features.
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
  async executeAI({ projectId, module, userInput, bypassCache = false, history = [], members = [] }) {
    console.log(`[AIEngine] executeAI invoked for module "${module}" and project "${projectId}"`);
    
    let projectContext = '';
    if (projectId) {
      try {
        projectContext = await ContextBuilder.buildContext(projectId, bypassCache);
      } catch (contextErr) {
        console.warn(`[AIEngine] ContextBuilder failed: ${contextErr.message}. Proceeding with blank context.`);
      }
    }

    // Build Prompt
    const payload = PromptManager.buildPrompt(module, {
      projectContext,
      userInput,
      history
    });

    let rawText = '';
    let providerUsed = 'None';
    let failed = false;

    try {
      // Execute with Failover Pipeline
      const result = await AIProviderManager.executeWithFailover(payload);
      rawText = result.text;
      providerUsed = result.providerUsed;
    } catch (pipelineErr) {
      console.error(`[AIEngine] Failover pipeline exhausted: ${pipelineErr.message}. Activating graceful fallback.`);
      failed = true;
      
      // Get graceful mock fallback
      const fallbackResult = FallbackManager.getFallbackResponse(module, userInput, {
        projectContext,
        members
      });

      // If mock response is already structured object, return it. Else, parse it.
      if (typeof fallbackResult === 'object') {
        return fallbackResult;
      }
      rawText = fallbackResult;
    }

    // Validate, parse and normalize response
    const finalResult = ResponseValidator.validateAndNormalize(rawText, module);

    // Background operations: Memory extraction for chats
    if (!failed && module === 'chatWithMentor' && projectId) {
      const responseContent = typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult);
      // Run background memory extraction and decisions parsing
      MemoryManager.extractAndAddMemory(
        projectId,
        typeof userInput === 'string' ? userInput : JSON.stringify(userInput),
        responseContent,
        (params) => this.executeAI({ projectId, ...params })
      ).catch(memErr => {
        console.error('[AIEngine] Background Memory extraction failed:', memErr.message);
      });
    }

    return finalResult;
  }

  /**
   * Exposes analytics summary.
   */
  getAnalyticsSummary() {
    return AnalyticsService.getSummary();
  }
}

module.exports = new AIEngine();
