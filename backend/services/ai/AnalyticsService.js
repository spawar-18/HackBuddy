/**
 * AnalyticsService
 * Tracks runtime execution metrics, success/failure counts, latency and token usage.
 */
class AnalyticsService {
  constructor() {
    this.stats = {
      totalRequests: 0,
      totalSuccess: 0,
      totalFailures: 0,
      fallbackUsageCount: 0,
      providers: {}
    };
  }

  /**
   * Initializes stats for a provider if not exists.
   * @param {string} providerName 
   */
  _ensureProvider(providerName) {
    if (!this.stats.providers[providerName]) {
      this.stats.providers[providerName] = {
        requests: 0,
        successes: 0,
        failures: 0,
        totalLatencyMs: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        errors: []
      };
    }
  }

  /**
   * Tracks details of an AI execution.
   * @param {object} metric 
   */
  trackCall(metric) {
    const { provider, success, latencyMs, tokens = {}, error = null, fallbackCount = 0 } = metric;
    
    this.stats.totalRequests++;
    if (success) {
      this.stats.totalSuccess++;
    } else {
      this.stats.totalFailures++;
    }

    if (fallbackCount > 0) {
      this.stats.fallbackUsageCount += fallbackCount;
    }

    if (provider) {
      this._ensureProvider(provider);
      const pStats = this.stats.providers[provider];
      pStats.requests++;
      if (success) {
        pStats.successes++;
      } else {
        pStats.failures++;
      }
      pStats.totalLatencyMs += latencyMs;
      
      const promptCount = tokens.promptTokens || 0;
      const compCount = tokens.completionTokens || 0;
      pStats.promptTokens += promptCount;
      pStats.completionTokens += compCount;
      pStats.totalTokens += (promptCount + compCount);

      if (error) {
        pStats.errors.push({
          timestamp: new Date().toISOString(),
          message: error
        });
        // Limit errors array size
        if (pStats.errors.length > 50) {
          pStats.errors.shift();
        }
      }
    }
  }

  /**
   * Returns analytics summary.
   * @returns {object}
   */
  getSummary() {
    const providerSummaries = {};
    
    Object.keys(this.stats.providers).forEach(pName => {
      const pStats = this.stats.providers[pName];
      const avgLatency = pStats.requests > 0 ? Math.round(pStats.totalLatencyMs / pStats.requests) : 0;
      const successRate = pStats.requests > 0 ? parseFloat(((pStats.successes / pStats.requests) * 100).toFixed(2)) : 0;
      
      providerSummaries[pName] = {
        requestsCount: pStats.requests,
        successesCount: pStats.successes,
        failuresCount: pStats.failures,
        successRatePercentage: successRate,
        averageLatencyMs: avgLatency,
        tokenUsage: {
          promptTokens: pStats.promptTokens,
          completionTokens: pStats.completionTokens,
          totalTokens: pStats.totalTokens
        },
        errorRate: pStats.requests > 0 ? parseFloat(((pStats.failures / pStats.requests) * 100).toFixed(2)) : 0
      };
    });

    const overallSuccessRate = this.stats.totalRequests > 0 
      ? parseFloat(((this.stats.totalSuccess / this.stats.totalRequests) * 100).toFixed(2))
      : 0;

    return {
      totalRequests: this.stats.totalRequests,
      totalSuccess: this.stats.totalSuccess,
      totalFailures: this.stats.totalFailures,
      overallSuccessRatePercentage: overallSuccessRate,
      fallbackUsageCount: this.stats.fallbackUsageCount,
      providers: providerSummaries
    };
  }
}

module.exports = new AnalyticsService();
