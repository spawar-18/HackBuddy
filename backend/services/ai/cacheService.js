/**
 * CacheService
 * Caches project contexts to optimize API latency and reduce database/token overhead.
 * Never caches AI responses directly, as requested.
 */
class CacheService {
  constructor() {
    this.contextCache = new Map();
    this.ttlMs = 5 * 60 * 1000; // 5 minutes TTL
  }

  /**
   * Caches the compiled project context.
   * @param {string} projectId - The project ID
   * @param {string} contextString - The compiled context string
   */
  setContext(projectId, contextString) {
    if (!projectId) return;
    this.contextCache.set(projectId.toString(), {
      context: contextString,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieves the cached project context if present and not expired.
   * @param {string} projectId - The project ID
   * @returns {string|null} The cached context or null
   */
  getContext(projectId) {
    if (!projectId) return null;
    const entry = this.contextCache.get(projectId.toString());
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.contextCache.delete(projectId.toString());
      return null;
    }
    return entry.context;
  }

  /**
   * Invalidates the cached context for a specific project, or clears all cache.
   * @param {string} [projectId] - The project ID to invalidate
   */
  invalidate(projectId) {
    if (!projectId) {
      this.contextCache.clear();
      return;
    }
    this.contextCache.delete(projectId.toString());
  }
}

module.exports = new CacheService();
