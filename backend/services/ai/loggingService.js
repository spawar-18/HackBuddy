const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH = path.join(__dirname, '..', '..', 'persistent_calls.log');

/**
 * Logs details of an AI execution call to a persistent log file.
 * @param {object} data - Telemetry data for the AI call
 */
const logCall = (data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    modelName: data.modelName || 'unknown',
    promptVersion: data.promptVersion || '1.0.0',
    latencyMs: data.latencyMs || 0,
    tokenUsage: data.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    errors: data.errors || null,
    retries: data.retries || 0,
    responseTime: data.responseTime || data.latencyMs || 0,
    endpoint: data.endpoint || 'unknown'
  };

  try {
    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(logEntry) + '\n');
    console.log(`[AI Log] Registered call to ${logEntry.endpoint} (${logEntry.modelName}) in ${logEntry.latencyMs}ms. Status: ${logEntry.errors ? 'ERROR' : 'SUCCESS'}`);
  } catch (err) {
    console.error('Failed to write to persistent_calls.log:', err);
  }
};

module.exports = {
  logCall
};
