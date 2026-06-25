/**
 * GitHub Repository Sync Service
 * ================================
 * Handles all synchronization logic between the GitHub API and our DB cache.
 * - Never calls GitHub API on every request
 * - Syncs every 10-15 min via lastSyncedAt check
 * - Supports manual sync trigger (owner only)
 * - Gracefully handles GitHub API failures
 */

const GitHubRepository = require('../models/GitHubRepository');
const github = require('./githubService');

const SYNC_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

/**
 * Determine if a sync is needed based on lastSyncedAt.
 * @param {Date|null} lastSyncedAt
 * @returns {boolean}
 */
const needsSync = (lastSyncedAt) => {
  if (!lastSyncedAt) return true;
  return (Date.now() - new Date(lastSyncedAt).getTime()) > SYNC_INTERVAL_MS;
};

/**
 * Perform a full synchronization of GitHub data for a repository.
 * Fetches all data types and updates the cached data in DB.
 * @param {string} projectId
 * @param {boolean} force - Skip the time-based throttle check
 * @returns {Promise<object>} Updated GitHubRepository document
 */
const syncRepository = async (projectId, force = false) => {
  const repoDoc = await GitHubRepository.findOne({ projectId });
  if (!repoDoc) throw new Error('Repository not connected to this project');

  // Throttle check (unless forced)
  if (!force && !needsSync(repoDoc.lastSyncedAt)) {
    console.log(`[SyncService] Skipping sync for project ${projectId} – recently synced.`);
    return repoDoc;
  }

  const { owner, repository: repo, defaultBranch } = repoDoc;

  console.log(`[SyncService] Syncing GitHub repository ${owner}/${repo} for project ${projectId}...`);

  // Mark as Syncing
  repoDoc.connectionStatus = 'Syncing';
  await repoDoc.save();

  const results = {};
  const errors = [];

  // ── Parallel fetch all data types ──────────────────────────────────────────
  await Promise.allSettled([
    github.fetchRepository(owner, repo, true)
      .then(d => { results.repoInfo = d; })
      .catch(e => errors.push(`repoInfo: ${e.message}`)),

    github.fetchCommits(owner, repo, defaultBranch, 50, true)
      .then(d => { results.commits = d || []; })
      .catch(e => errors.push(`commits: ${e.message}`)),

    github.fetchPullRequests(owner, repo, 'all', true)
      .then(d => { results.pullRequests = d || []; })
      .catch(e => errors.push(`pullRequests: ${e.message}`)),

    github.fetchIssues(owner, repo, 'all', true)
      .then(d => { results.issues = d || []; })
      .catch(e => errors.push(`issues: ${e.message}`)),

    github.fetchBranches(owner, repo, true)
      .then(d => { results.branches = d || []; })
      .catch(e => errors.push(`branches: ${e.message}`)),

    github.fetchContributors(owner, repo, true)
      .then(d => { results.contributors = d || []; })
      .catch(e => errors.push(`contributors: ${e.message}`)),

    github.fetchLanguages(owner, repo, true)
      .then(d => { results.languages = d || {}; })
      .catch(e => errors.push(`languages: ${e.message}`)),

    github.fetchReleases(owner, repo, true)
      .then(d => { results.releases = d || []; })
      .catch(e => errors.push(`releases: ${e.message}`)),

    github.fetchWorkflows(owner, repo, true)
      .then(d => { results.workflows = d || []; })
      .catch(e => errors.push(`workflows: ${e.message}`)),

    github.fetchReadme(owner, repo, true)
      .then(d => { results.hasReadme = d?.exists || false; })
      .catch(e => errors.push(`readme: ${e.message}`)),

    github.fetchRepositoryTree(owner, repo, defaultBranch, true, true)
      .then(d => { results.tree = d || []; })
      .catch(e => errors.push(`tree: ${e.message}`)),
  ]);

  if (errors.length > 0) {
    console.warn(`[SyncService] Sync completed with ${errors.length} partial errors:`, errors.join(' | '));
  }

  // If we got the repo info, update visibility
  if (results.repoInfo) {
    repoDoc.repositoryVisibility = results.repoInfo.private ? 'private' : 'public';
    repoDoc.repositoryUrl = results.repoInfo.html_url || repoDoc.repositoryUrl;
    repoDoc.defaultBranch = results.repoInfo.default_branch || repoDoc.defaultBranch;
  }

  // Update cached data
  repoDoc.cachedData = {
    repoInfo: results.repoInfo || repoDoc.cachedData?.repoInfo || null,
    commits: results.commits || repoDoc.cachedData?.commits || [],
    pullRequests: results.pullRequests || repoDoc.cachedData?.pullRequests || [],
    issues: results.issues || repoDoc.cachedData?.issues || [],
    branches: results.branches || repoDoc.cachedData?.branches || [],
    contributors: results.contributors || repoDoc.cachedData?.contributors || [],
    languages: results.languages || repoDoc.cachedData?.languages || {},
    releases: results.releases || repoDoc.cachedData?.releases || [],
    workflows: results.workflows || repoDoc.cachedData?.workflows || [],
    hasReadme: results.hasReadme !== undefined ? results.hasReadme : (repoDoc.cachedData?.hasReadme || false),
    tree: results.tree || repoDoc.cachedData?.tree || []
  };

  // Update timestamps
  repoDoc.lastSyncedAt = new Date();
  repoDoc.connectionStatus = errors.length > 5 ? 'Error' : 'Connected';
  repoDoc.markModified('cachedData');

  await repoDoc.save();

  console.log(`[SyncService] Sync complete for ${owner}/${repo}. Status: ${repoDoc.connectionStatus}`);
  return repoDoc;
};

/**
 * Connect a repository to a project and immediately sync.
 * @param {object} params - { projectId, owner, repository, defaultBranch, repositoryUrl, connectedBy }
 * @returns {Promise<object>} Created GitHubRepository document
 */
const connectRepository = async ({ projectId, owner, repository, defaultBranch = 'main', repositoryUrl, connectedBy }) => {
  // Validate repository exists on GitHub first
  try {
    await github.fetchRepository(owner, repository, true);
  } catch (err) {
    if (err.message === 'GITHUB_NOT_FOUND') throw new Error('Repository not found on GitHub. Check owner and repository name.');
    if (err.message === 'GITHUB_UNAUTHORIZED') throw new Error('This repository is private and requires a GitHub token with access.');
    throw err;
  }

  // Upsert the document
  let repoDoc = await GitHubRepository.findOne({ projectId });
  if (repoDoc) {
    // Update existing connection
    repoDoc.owner = owner;
    repoDoc.repository = repository;
    repoDoc.defaultBranch = defaultBranch || 'main';
    repoDoc.repositoryUrl = repositoryUrl || `https://github.com/${owner}/${repository}`;
    repoDoc.connectedBy = connectedBy;
    repoDoc.connectedAt = new Date();
    repoDoc.connectionStatus = 'Connected';
    repoDoc.lastSyncedAt = null; // Force re-sync
    await repoDoc.save();
  } else {
    repoDoc = await GitHubRepository.create({
      projectId,
      owner,
      repository,
      defaultBranch: defaultBranch || 'main',
      repositoryUrl: repositoryUrl || `https://github.com/${owner}/${repository}`,
      connectedBy,
      connectionStatus: 'Connected',
      lastSyncedAt: null
    });
  }

  // Trigger an initial sync (fire and forget — don't block the response)
  syncRepository(projectId, true).catch(err => {
    console.error(`[SyncService] Initial sync failed for project ${projectId}:`, err.message);
  });

  return repoDoc;
};

module.exports = {
  syncRepository,
  connectRepository,
  needsSync
};
