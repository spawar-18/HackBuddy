/**
 * RetryService
 * Executes async operations with built-in timeout bounds and retry controls.
 */
class RetryService {
  /**
   * Promise wrapper that rejects if it exceeds timeoutMs.
   * @param {Promise} promise - The promise to check
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise}
   */
  withTimeout(promise, timeoutMs) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([
      promise.then(res => {
        clearTimeout(timeoutId);
        return res;
      }),
      timeoutPromise
    ]);
  }

  /**
   * Executes a task function with retries and timeout constraints.
   * @param {function} taskFn - The async function to run
   * @param {object} options 
   * @param {number} [options.maxRetries=1] 
   * @param {number} [options.timeoutMs=15000] 
   * @param {number} [options.delayMs=1000] 
   * @returns {Promise<any>}
   */
  async executeWithRetry(taskFn, { maxRetries = 1, timeoutMs = 15000, delayMs = 1000 } = {}) {
    let attempt = 0;
    
    while (true) {
      attempt++;
      try {
        // Run function wrapped with timeout
        return await this.withTimeout(taskFn(), timeoutMs);
      } catch (err) {
        const isTimeout = err.message.includes('timed out');
        console.warn(`[RetryService] Attempt ${attempt}/${maxRetries + 1} failed. Error: ${err.message}`);

        if (attempt > maxRetries) {
          throw err;
        }

        // Wait before retry (longer delay on timeouts or rate limits)
        const delay = isTimeout ? delayMs * 2 : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

module.exports = new RetryService();
