/**
 * CacheManager
 * Caches compiled central project contexts for a set TTL to reduce DB overhead.
 * Never caches final LLM responses.
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = 3 * 60 * 1000; // 3 minutes cache lifetime
  }

  /**
   * Caches context string.
   * @param {string} projectId 
   * @param {string} contextString 
   */
  setContext(projectId, contextString) {
    if (!projectId) return;
    this.cache.set(projectId.toString(), {
      context: contextString,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieves cached context string.
   * @param {string} projectId 
   * @returns {string|null}
   */
  getContext(projectId) {
    if (!projectId) return null;
    const entry = this.cache.get(projectId.toString());
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(projectId.toString());
      return null;
    }
    return entry.context;
  }

  /**
   * Invalidates context cache for a project or all projects.
   * @param {string} [projectId] 
   */
  invalidate(projectId) {
    if (!projectId) {
      this.cache.clear();
    } else {
      this.cache.delete(projectId.toString());
    }
  }
}

module.exports = new CacheManager();
