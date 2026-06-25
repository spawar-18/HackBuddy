/**
 * GitHub REST API Service
 * ========================
 * Provides reusable methods to interact with the GitHub REST API.
 * Uses a Personal Access Token (PAT) if GITHUB_TOKEN is set.
 * Handles rate limits and errors gracefully.
 * Designed to be extended with new endpoints easily.
 */

const https = require('https');

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const DEFAULT_PER_PAGE = 30;

// ─── In-Memory Response Cache ────────────────────────────────────────────────
const _cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const _cacheKey = (owner, repo, endpoint) => `${owner}/${repo}${endpoint}`;
const _fromCache = (key) => {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
};
const _toCache = (key, data) => {
  _cache.set(key, { ts: Date.now(), data });
};
const clearRepoCache = (owner, repo) => {
  for (const key of _cache.keys()) {
    if (key.startsWith(`${owner}/${repo}`)) _cache.delete(key);
  }
};

// ─── Core HTTP Request ────────────────────────────────────────────────────────

/**
 * Make a GitHub REST API request.
 * @param {string} path - API path (e.g. /repos/owner/repo/commits)
 * @param {object} [opts] - { method, body, bypassCache }
 * @returns {Promise<any>} Parsed JSON response
 */
const githubRequest = (path, opts = {}) => {
  return new Promise((resolve, reject) => {
    const { method = 'GET', body = null } = opts;

    const headers = {
      'User-Agent': 'HackBuddy-App/1.0',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers,
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Rate limit handling
        const remaining = parseInt(res.headers['x-ratelimit-remaining'] || '1', 10);
        const reset = parseInt(res.headers['x-ratelimit-reset'] || '0', 10);

        if (res.statusCode === 429 || (res.statusCode === 403 && remaining === 0)) {
          const waitSec = Math.max(0, reset - Math.floor(Date.now() / 1000));
          return reject(new Error(`GitHub API rate limit exceeded. Resets in ${waitSec}s.`));
        }

        if (res.statusCode === 404) {
          return reject(new Error('GITHUB_NOT_FOUND'));
        }

        if (res.statusCode === 401 || res.statusCode === 403) {
          return reject(new Error('GITHUB_UNAUTHORIZED'));
        }

        if (res.statusCode >= 400) {
          let errMsg = `GitHub API error: ${res.statusCode}`;
          try {
            const parsed = JSON.parse(data);
            if (parsed.message) errMsg = `GitHub: ${parsed.message}`;
          } catch (_) {}
          return reject(new Error(errMsg));
        }

        if (!data || data.trim() === '') {
          return resolve(null);
        }

        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse GitHub API response as JSON'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('GitHub API request timed out'));
    });

    req.on('error', (err) => {
      reject(new Error(`GitHub API network error: ${err.message}`));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
};

// ─── Cached Request Wrapper ───────────────────────────────────────────────────

const cachedRequest = async (owner, repo, endpoint, bypassCache = false) => {
  const key = _cacheKey(owner, repo, endpoint);
  if (!bypassCache) {
    const cached = _fromCache(key);
    if (cached !== null) return cached;
  }
  const data = await githubRequest(endpoint);
  _toCache(key, data);
  return data;
};

// ─── Public Service Methods ───────────────────────────────────────────────────

/**
 * Verify repository exists and is accessible.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<object>} Repository details
 */
const fetchRepository = async (owner, repo, bypassCache = false) => {
  return cachedRequest(owner, repo, `/repos/${owner}/${repo}`, bypassCache);
};

/**
 * Fetch repository contributors.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<Array>}
 */
const fetchContributors = async (owner, repo, bypassCache = false) => {
  return cachedRequest(owner, repo, `/repos/${owner}/${repo}/contributors?per_page=${DEFAULT_PER_PAGE}`, bypassCache);
};

/**
 * Fetch recent commits from a branch.
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {number} count
 * @returns {Promise<Array>}
 */
const fetchCommits = async (owner, repo, branch = 'main', count = 50, bypassCache = false) => {
  return cachedRequest(
    owner, repo,
    `/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${count}`,
    bypassCache
  );
};

/**
 * Fetch pull requests.
 * @param {string} owner
 * @param {string} repo
 * @param {string} state - 'open' | 'closed' | 'all'
 * @returns {Promise<Array>}
 */
const fetchPullRequests = async (owner, repo, state = 'all', bypassCache = false) => {
  return cachedRequest(
    owner, repo,
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${DEFAULT_PER_PAGE}`,
    bypassCache
  );
};

/**
 * Fetch issues (excludes PRs).
 * @param {string} owner
 * @param {string} repo
 * @param {string} state - 'open' | 'closed' | 'all'
 * @returns {Promise<Array>}
 */
const fetchIssues = async (owner, repo, state = 'all', bypassCache = false) => {
  const data = await cachedRequest(
    owner, repo,
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=${DEFAULT_PER_PAGE}`,
    bypassCache
  );
  // GitHub issues endpoint also returns PRs – filter them out
  return (data || []).filter(i => !i.pull_request);
};

/**
 * Fetch branches.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<Array>}
 */
const fetchBranches = async (owner, repo, bypassCache = false) => {
  return cachedRequest(owner, repo, `/repos/${owner}/${repo}/branches?per_page=50`, bypassCache);
};

/**
 * Fetch repository file tree (top-level only).
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @returns {Promise<Array>}
 */
/**
 * Fetch repository file tree (recursive optional).
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {boolean} recursive
 * @param {boolean} bypassCache
 * @returns {Promise<Array>}
 */
const fetchRepositoryTree = async (owner, repo, branch = 'main', recursive = false, bypassCache = false) => {
  const data = await cachedRequest(
    owner, repo,
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=${recursive ? 'true' : 'false'}`,
    bypassCache
  );
  return data?.tree || [];
};

/**
 * Fetch a file content (base64 decoded).
 * Returns null if file doesn't exist.
 * @param {string} owner
 * @param {string} repo
 * @param {string} path
 * @param {string} branch
 * @param {boolean} bypassCache
 * @returns {Promise<string|null>}
 */
const fetchFileContent = async (owner, repo, path, branch = 'main', bypassCache = false) => {
  try {
    const data = await cachedRequest(
      owner,
      repo,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
      bypassCache
    );
    if (data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch (err) {
    if (err.message === 'GITHUB_NOT_FOUND') return null;
    throw err;
  }
};

/**
 * Fetch languages breakdown.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<object>} { JavaScript: 12345, Python: 6789 }
 */
const fetchLanguages = async (owner, repo, bypassCache = false) => {
  return cachedRequest(owner, repo, `/repos/${owner}/${repo}/languages`, bypassCache);
};

/**
 * Fetch releases.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<Array>}
 */
const fetchReleases = async (owner, repo, bypassCache = false) => {
  return cachedRequest(owner, repo, `/repos/${owner}/${repo}/releases?per_page=5`, bypassCache);
};

/**
 * Fetch GitHub Actions workflows.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<Array>}
 */
const fetchWorkflows = async (owner, repo, bypassCache = false) => {
  const data = await cachedRequest(owner, repo, `/repos/${owner}/${repo}/actions/workflows`, bypassCache);
  return data?.workflows || [];
};

/**
 * Fetch README existence & content (base64 decoded).
 * Returns null if README doesn't exist.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<{exists: boolean, content: string|null}>}
 */
const fetchReadme = async (owner, repo, bypassCache = false) => {
  try {
    const data = await cachedRequest(owner, repo, `/repos/${owner}/${repo}/readme`, bypassCache);
    if (data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 2000);
      return { exists: true, content };
    }
    return { exists: false, content: null };
  } catch (err) {
    if (err.message === 'GITHUB_NOT_FOUND') return { exists: false, content: null };
    throw err;
  }
};

/**
 * Fetch a single commit with stats (insertions, deletions, files changed).
 * @param {string} owner
 * @param {string} repo
 * @param {string} sha
 * @returns {Promise<object>}
 */
const fetchCommitDetail = async (owner, repo, sha) => {
  return githubRequest(`/repos/${owner}/${repo}/commits/${sha}`);
};

module.exports = {
  fetchRepository,
  fetchContributors,
  fetchCommits,
  fetchPullRequests,
  fetchIssues,
  fetchBranches,
  fetchRepositoryTree,
  fetchFileContent,
  fetchLanguages,
  fetchReleases,
  fetchWorkflows,
  fetchReadme,
  fetchCommitDetail,
  clearRepoCache,
  githubRequest
};
