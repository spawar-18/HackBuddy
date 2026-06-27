const crypto = require('crypto');

/**
 * ResponseCacheService
 * In-memory TTL cache for deterministic AI outputs. Mentor chat and other
 * conversational modules opt out through cacheTtlMs = 0.
 */
class ResponseCacheService {
  constructor() {
    this.cache = new Map();
  }

  createKey({ module, projectId, userInput, promptVersion }) {
    const inputHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ module, projectId: projectId || null, userInput, promptVersion }))
      .digest('hex');

    return `${module}:${inputHash}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlMs) {
    if (!ttlMs || ttlMs <= 0) return;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  invalidate(prefix) {
    if (!prefix) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new ResponseCacheService();
