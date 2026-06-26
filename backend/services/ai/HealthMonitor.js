const LoggingService = require('./loggingService');

/**
 * HealthMonitor
 * Tracks provider health. Disables failing providers and automatically recovers them after cooldown.
 */
class HealthMonitor {
  constructor() {
    this.providerStates = {};
    this.cooldownPeriodMs = 2 * 60 * 1000; // 2 minutes cooldown
    this.failureThreshold = 3; // Disable after 3 consecutive failures
  }

  /**
   * Initializes status tracking for a provider.
   * @param {string} providerName 
   */
  _ensureProvider(providerName) {
    if (!this.providerStates[providerName]) {
      this.providerStates[providerName] = {
        isHealthy: true,
        consecutiveFailures: 0,
        disabledUntil: null,
        lastFailureTime: null
      };
    }
  }

  /**
   * Reports a successful call for a provider.
   * @param {string} providerName 
   */
  reportSuccess(providerName) {
    this._ensureProvider(providerName);
    const state = this.providerStates[providerName];
    
    if (!state.isHealthy) {
      state.isHealthy = true;
      state.consecutiveFailures = 0;
      state.disabledUntil = null;
      LoggingService.logHealthChange(providerName, 'healthy', 'Successful execution after cooldown recovery.');
    } else {
      state.consecutiveFailures = 0;
    }
  }

  /**
   * Reports a failed call for a provider.
   * @param {string} providerName 
   * @param {string} reason 
   */
  reportFailure(providerName, reason) {
    this._ensureProvider(providerName);
    const state = this.providerStates[providerName];
    
    state.consecutiveFailures++;
    state.lastFailureTime = Date.now();

    if (state.isHealthy && state.consecutiveFailures >= this.failureThreshold) {
      state.isHealthy = false;
      state.disabledUntil = Date.now() + this.cooldownPeriodMs;
      LoggingService.logHealthChange(
        providerName, 
        'unhealthy', 
        `Consecutive failures reached threshold (${state.consecutiveFailures}). Disabled for ${this.cooldownPeriodMs / 1000}s. Error: ${reason}`
      );
    }
  }

  /**
   * Checks if a provider is currently healthy/available.
   * Performs automatic recovery if the cooldown period has expired.
   * @param {string} providerName 
   * @returns {boolean}
   */
  isAvailable(providerName) {
    this._ensureProvider(providerName);
    const state = this.providerStates[providerName];

    if (state.isHealthy) return true;

    // Check if recovery is due
    if (state.disabledUntil && Date.now() >= state.disabledUntil) {
      state.isHealthy = true;
      state.consecutiveFailures = 0;
      state.disabledUntil = null;
      LoggingService.logHealthChange(providerName, 'healthy', 'Auto-recovery cooldown completed.');
      return true;
    }

    return false;
  }

  /**
   * Returns health states of all tracked providers.
   * @returns {object}
   */
  getHealthStates() {
    return this.providerStates;
  }
}

module.exports = new HealthMonitor();
