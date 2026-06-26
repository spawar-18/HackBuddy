const HealthMonitor = require('./HealthMonitor');
const AnalyticsService = require('./AnalyticsService');
const LoggingService = require('./LoggingService');
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
    let fallbackCount = 0;
    
    // 1. ATTEMPT GLM-5.2 (Primary)
    const glm = this.providers.get('GLMProvider');
    if (glm && HealthMonitor.isAvailable('GLMProvider')) {
      const start = Date.now();
      try {
        console.log('[AIProviderManager] Pipeline Stage 1: Running GLM-5.2...');
        const responseText = await RetryService.executeWithRetry(
          () => glm.execute(payload),
          { maxRetries: 0, timeoutMs: 30000 } // No retry to avoid concurrency lockout
        );
        const latencyMs = Date.now() - start;

        // Success tracking
        HealthMonitor.reportSuccess('GLMProvider');
        const tokenUsage = this.estimateTokens(payload, responseText);
        
        AnalyticsService.trackCall({
          provider: 'GLMProvider',
          success: true,
          latencyMs,
          tokens: tokenUsage,
          fallbackCount
        });

        LoggingService.logCall({
          provider: 'GLMProvider',
          modelName: glm.getModelName(),
          promptVersion: payload.promptVersion,
          latencyMs,
          tokenUsage,
          endpoint: payload.endpointName,
          fallbackCount
        });

        return { text: responseText, providerUsed: 'GLMProvider' };
      } catch (err) {
        console.warn(`[AIProviderManager] GLM-5.2 failed: ${err.message}. Progressing pipeline...`);
        HealthMonitor.reportFailure('GLMProvider', err.message);
        
        const latencyMs = Date.now() - start;
        AnalyticsService.trackCall({
          provider: 'GLMProvider',
          success: false,
          latencyMs,
          error: err.message,
          fallbackCount
        });
        
        fallbackCount++;
      }
    } else {
      console.log('[AIProviderManager] GLM-5.2 is marked unhealthy. Skipping to next stage.');
      fallbackCount++;
    }

    // 2. ATTEMPT DeepSeek-V4-Pro (Fallback 1)
    const deepseek = this.providers.get('DeepSeekProvider');
    if (deepseek && HealthMonitor.isAvailable('DeepSeekProvider')) {
      const start = Date.now();
      try {
        console.log('[AIProviderManager] Pipeline Stage 2: Running DeepSeek-V4-Pro...');
        // Standard execution for DeepSeek
        const responseText = await RetryService.executeWithRetry(
          () => deepseek.execute(payload),
          { maxRetries: 0, timeoutMs: 45000 }
        );
        const latencyMs = Date.now() - start;

        HealthMonitor.reportSuccess('DeepSeekProvider');
        const tokenUsage = this.estimateTokens(payload, responseText);

        AnalyticsService.trackCall({
          provider: 'DeepSeekProvider',
          success: true,
          latencyMs,
          tokens: tokenUsage,
          fallbackCount
        });

        LoggingService.logCall({
          provider: 'DeepSeekProvider',
          modelName: deepseek.getModelName(),
          promptVersion: payload.promptVersion,
          latencyMs,
          tokenUsage,
          endpoint: payload.endpointName,
          fallbackCount
        });

        return { text: responseText, providerUsed: 'DeepSeekProvider' };
      } catch (err) {
        console.warn(`[AIProviderManager] DeepSeek-V4-Pro failed: ${err.message}. Progressing pipeline...`);
        HealthMonitor.reportFailure('DeepSeekProvider', err.message);

        const latencyMs = Date.now() - start;
        AnalyticsService.trackCall({
          provider: 'DeepSeekProvider',
          success: false,
          latencyMs,
          error: err.message,
          fallbackCount
        });

        fallbackCount++;
      }
    } else {
      console.log('[AIProviderManager] DeepSeek-V4-Pro is marked unhealthy. Skipping to next stage.');
      fallbackCount++;
    }

    // 3. ATTEMPT Gemini 2.5 Flash (Fallback 2)
    const gemini = this.providers.get('GeminiProvider');
    if (gemini && HealthMonitor.isAvailable('GeminiProvider')) {
      const start = Date.now();
      try {
        console.log('[AIProviderManager] Pipeline Stage 3: Running Gemini 2.5 Flash...');
        const responseText = await RetryService.executeWithRetry(
          () => gemini.execute(payload),
          { maxRetries: 0, timeoutMs: 45000 }
        );
        const latencyMs = Date.now() - start;

        HealthMonitor.reportSuccess('GeminiProvider');
        const tokenUsage = this.estimateTokens(payload, responseText);

        AnalyticsService.trackCall({
          provider: 'GeminiProvider',
          success: true,
          latencyMs,
          tokens: tokenUsage,
          fallbackCount
        });

        LoggingService.logCall({
          provider: 'GeminiProvider',
          modelName: gemini.getModelName(),
          promptVersion: payload.promptVersion,
          latencyMs,
          tokenUsage,
          endpoint: payload.endpointName,
          fallbackCount
        });

        return { text: responseText, providerUsed: 'GeminiProvider' };
      } catch (err) {
        console.error(`[AIProviderManager] Gemini 2.5 Flash failed: ${err.message}. Pipeline exhausted.`);
        HealthMonitor.reportFailure('GeminiProvider', err.message);

        const latencyMs = Date.now() - start;
        AnalyticsService.trackCall({
          provider: 'GeminiProvider',
          success: false,
          latencyMs,
          error: err.message,
          fallbackCount
        });
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
}

module.exports = new AIProviderManager();
