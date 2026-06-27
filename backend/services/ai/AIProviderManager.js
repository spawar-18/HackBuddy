const HealthMonitor = require('./HealthMonitor');
const AnalyticsService = require('./AnalyticsService');
const LoggingService = require('./loggingService');
const RetryService = require('./RetryService');

const GLMProvider = require('./GLMProvider');
const DeepSeekProvider = require('./DeepSeekProvider');
const GeminiProvider = require('./GeminiProvider');

/**
 * AIProviderManager
 * Coordinates AI executions, retries, latencies, provider health, failover routing, and dynamic registration.
 */
class AIProviderManager {
  constructor() {
    this.providers = new Map();
    
    // Register initial providers
    this.registerProvider(new GLMProvider());
    this.registerProvider(new DeepSeekProvider());
    this.registerProvider(new GeminiProvider());
  }

  /**
   * Dynamically registers a new provider.
   * Allows adding future models (Claude, GPT, Mistral, Qwen, etc.) without changes to central logic.
   * @param {object} provider - Instance of a provider class
   */
  registerProvider(provider) {
    const name = provider.getName();
    this.providers.set(name, provider);
    console.log(`[AIProviderManager] Registered provider: ${name} (${provider.getModelName()})`);
  }

  /**
   * Executes prompt payloads along the failover pipeline:
   * Attempt GLM-5.2 -> If timeout/fails retry once -> Switch to DeepSeek-V4-Pro -> Switch to Gemini-2.5-Flash -> Throw error.
   * @param {object} payload - The prompt payload from PromptManager
   * @returns {Promise<{text: string, providerUsed: string}>}
   */
  async executeWithFailover(payload) {
    return this.executeWithRouting(payload, {
      module: payload.schemaName || payload.endpointName,
      route: ['GLMProvider', 'DeepSeekProvider', 'GeminiProvider'],
      timeoutMs: 45000,
      maxRetries: 1
    });
  }

  /**
   * Executes prompt payloads using the module-specific intelligent route.
   * Validation errors are treated as provider failures so malformed JSON,
   * missing fields, hallucinated keys, and empty responses trigger retry and
   * failover transparently.
   * @param {object} payload
   * @param {object} options
   * @param {string[]} options.route
   * @param {function} [options.validate]
   * @returns {Promise<{text: string, providerUsed: string, normalized: any}>}
   */
  async executeWithRouting(payload, options = {}) {
    const {
      route = ['GLMProvider', 'DeepSeekProvider', 'GeminiProvider'],
      timeoutMs = 45000,
      maxRetries = 1,
      validate = null
    } = options;

    let fallbackCount = 0;

    for (const providerName of route) {
      const provider = this.providers.get(providerName);

      if (!provider || !HealthMonitor.isAvailable(providerName)) {
        console.log(`[AIProviderManager] ${providerName} unavailable. Skipping.`);
        fallbackCount++;
        continue;
      }

      const start = Date.now();
      try {
        console.log(`[AIProviderManager] Running ${payload.endpointName} via ${providerName} (${provider.getModelName()})`);
        const responseText = await RetryService.executeWithRetry(
          async () => {
            const text = await provider.execute(payload);
            const normalized = validate ? validate(text) : text;
            return { text, normalized };
          },
          { maxRetries, timeoutMs, delayMs: 750 }
        );

        const latencyMs = Date.now() - start;
        const tokenUsage = this.estimateTokens(payload, responseText.text);

        HealthMonitor.reportSuccess(providerName);
        AnalyticsService.trackCall({
          provider: providerName,
          success: true,
          latencyMs,
          tokens: tokenUsage,
          fallbackCount
        });

        LoggingService.logCall({
          provider: providerName,
          modelName: provider.getModelName(),
          promptVersion: payload.promptVersion,
          latencyMs,
          tokenUsage,
          endpoint: payload.endpointName,
          fallbackCount,
          fallback: fallbackCount > 0,
          module: payload.schemaName,
          cost: this.estimateCost(providerName, tokenUsage)
        });

        return {
          text: responseText.text,
          normalized: responseText.normalized,
          providerUsed: providerName
        };
      } catch (err) {
        const latencyMs = Date.now() - start;
        console.warn(`[AIProviderManager] ${providerName} failed for ${payload.endpointName}: ${err.message}`);
        HealthMonitor.reportFailure(providerName, err.message);
        AnalyticsService.trackCall({
          provider: providerName,
          success: false,
          latencyMs,
          error: err.message,
          fallbackCount
        });

        LoggingService.logCall({
          provider: providerName,
          modelName: provider.getModelName(),
          promptVersion: payload.promptVersion,
          latencyMs,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          errors: err.message,
          retries: maxRetries,
          endpoint: payload.endpointName,
          fallbackCount,
          fallback: fallbackCount > 0,
          module: payload.schemaName,
          cost: 0
        });

        fallbackCount++;
      }
    }

    throw new Error('All AI providers in the failover pipeline failed to execute.');
  }

  /**
   * Helper to estimate token counts based on standard character-to-token ratio.
   * @param {object} payload 
   * @param {string} responseText 
   */
  estimateTokens(payload, responseText) {
    const promptChars = JSON.stringify(payload.contents).length + (payload.systemInstruction || '').length;
    const completionChars = (responseText || '').length;

    // Estimate ~4 chars per token
    const promptTokens = Math.max(1, Math.round(promptChars / 4));
    const completionTokens = Math.max(1, Math.round(completionChars / 4));

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  }

  estimateCost(providerName, tokenUsage) {
    const ratesPer1k = {
      GLMProvider: 0.0002,
      DeepSeekProvider: 0.0003,
      GeminiProvider: 0.00015
    };
    const rate = ratesPer1k[providerName] || 0;
    return Number(((tokenUsage.totalTokens || 0) / 1000 * rate).toFixed(6));
  }
}

module.exports = new AIProviderManager();
