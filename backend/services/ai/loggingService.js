const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH = path.join(__dirname, '..', '..', 'persistent_calls.log');

/**
 * LoggingService
 * Telemetry logger that tracks all AI calls, providers, latencies, tokens, and errors.
 */
class LoggingService {
  /**
   * Logs details of an AI call.
   * @param {object} data 
   */
  logCall(data) {
    const entry = {
      timestamp: new Date().toISOString(),
      provider: data.provider || 'unknown',
      modelName: data.modelName || 'unknown',
      promptVersion: data.promptVersion || '1.0.0',
      latencyMs: data.latencyMs || 0,
      tokenUsage: data.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      errors: data.errors || null,
      retries: data.retries || 0,
      responseTime: data.latencyMs || 0,
      endpoint: data.endpoint || 'unknown',
      fallbackCount: data.fallbackCount || 0
    };

    try {
      fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(entry) + '\n');
      console.log(`[LoggingService] Call recorded: ${entry.endpoint} via ${entry.provider}/${entry.modelName} | Latency: ${entry.latencyMs}ms | Retries: ${entry.retries} | Status: ${entry.errors ? 'FAILED' : 'SUCCESS'}`);
    } catch (err) {
      console.error('[LoggingService] Failed to write persistent log:', err.message);
    }
  }

  /**
   * Logs provider health changes.
   * @param {string} providerName 
   * @param {string} status - 'unhealthy' | 'healthy'
   * @param {string} reason 
   */
  logHealthChange(providerName, status, reason) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'HEALTH_CHANGE',
      providerName,
      status,
      reason
    };

    try {
      fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(entry) + '\n');
      console.log(`[LoggingService] [HEALTH_UPDATE] Provider "${providerName}" is now marked "${status}". Reason: ${reason}`);
    } catch (err) {
      console.error('[LoggingService] Failed to write health update log:', err.message);
    }
  }
}

module.exports = new LoggingService();
