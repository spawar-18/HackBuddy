/**
 * Repository Health Service
 * ==========================
 * Calculates a health score and status for a connected GitHub repository
 * based on multiple indicators: commit activity, PRs, issues, branches,
 * README, testing files, deployment config, etc.
 */

/**
 * Determine if commits were made in the last N hours.
 * @param {Array} commits
 * @param {number} hours
 */
const hasRecentCommits = (commits, hours = 24) => {
  if (!commits || commits.length === 0) return false;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return commits.some(c => {
    const d = c?.commit?.author?.date || c?.commit?.committer?.date;
    return d && new Date(d).getTime() > cutoff;
  });
};

/**
 * Count commits made today (UTC).
 * @param {Array} commits
 * @returns {number}
 */
const commitsToday = (commits) => {
  if (!commits || commits.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  return commits.filter(c => {
    const d = c?.commit?.author?.date || '';
    return d.startsWith(today);
  }).length;
};

/**
 * Count commits in the last N days.
 */
const commitsInLastDays = (commits, days = 7) => {
  if (!commits || commits.length === 0) return 0;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return commits.filter(c => {
    const d = c?.commit?.author?.date || c?.commit?.committer?.date;
    return d && new Date(d).getTime() > cutoff;
  }).length;
};

/**
 * Check if there are deployment-related files in the tree.
 */
const hasDeploymentConfig = (tree) => {
  const deployPatterns = [
    'dockerfile', 'docker-compose', 'heroku', 'vercel', 'netlify',
    'render', 'fly.toml', '.github/workflows', 'k8s', 'kubernetes',
    'buildspec', 'appspec', 'procfile', 'app.yaml', 'serverless'
  ];
  const names = (tree || []).map(f => (f.path || '').toLowerCase());
  return deployPatterns.some(p => names.some(n => n.includes(p)));
};

/**
 * Check if there are test files in the tree.
 */
const hasTestFiles = (tree) => {
  const testPatterns = [
    'test', 'spec', 'jest', 'vitest', 'cypress', 'playwright',
    '__tests__', '.test.', '.spec.', 'testing'
  ];
  const names = (tree || []).map(f => (f.path || '').toLowerCase());
  return testPatterns.some(p => names.some(n => n.includes(p)));
};

/**
 * Build enriched contributor activity cards.
 * @param {Array} contributors - from GitHub API
 * @param {Array} commits - full commit list
 * @returns {Array}
 */
const buildContributorActivity = (contributors, commits) => {
  if (!contributors || contributors.length === 0) return [];

  const activityMap = {};

  // Tally commit stats per contributor
  (commits || []).forEach(commit => {
    const author = commit?.commit?.author?.name || commit?.author?.login || 'Unknown';
    const login = commit?.author?.login || author;
    const date = commit?.commit?.author?.date || '';

    if (!activityMap[login]) {
      activityMap[login] = {
        login,
        name: author,
        commits: 0,
        lastActive: null,
        recentCommits: 0
      };
    }

    activityMap[login].commits++;

    if (!activityMap[login].lastActive || date > activityMap[login].lastActive) {
      activityMap[login].lastActive = date;
    }

    // Count commits in last 24h
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    if (date && new Date(date).getTime() > cutoff24h) {
      activityMap[login].recentCommits++;
    }
  });

  return contributors.map(c => {
    const activity = activityMap[c.login] || {};
    return {
      login: c.login,
      avatar: c.avatar_url || null,
      profileUrl: c.html_url || null,
      commits: c.contributions || activity.commits || 0,
      lastActive: activity.lastActive || null,
      recentCommits: activity.recentCommits || 0,
      isActive: !!activity.lastActive && (Date.now() - new Date(activity.lastActive).getTime()) < 7 * 24 * 60 * 60 * 1000
    };
  });
};

/**
 * Build a summary object from raw commit data (for display).
 * @param {Array} commits
 * @returns {object}
 */
const buildCommitSummary = (commits) => {
  if (!commits || commits.length === 0) {
    return {
      totalFetched: 0,
      commitsToday: 0,
      last7Days: 0,
      lastCommitAt: null,
      lastCommitMessage: null,
      lastCommitAuthor: null,
      topAuthors: []
    };
  }

  const authorCounts = {};
  (commits || []).forEach(c => {
    const author = c?.commit?.author?.name || c?.author?.login || 'Unknown';
    authorCounts[author] = (authorCounts[author] || 0) + 1;
  });

  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const latestCommit = commits[0];
  return {
    totalFetched: commits.length,
    commitsToday: commitsToday(commits),
    last7Days: commitsInLastDays(commits, 7),
    lastCommitAt: latestCommit?.commit?.author?.date || null,
    lastCommitMessage: latestCommit?.commit?.message?.split('\n')[0] || null,
    lastCommitAuthor: latestCommit?.commit?.author?.name || null,
    topAuthors
  };
};

/**
 * Calculate a comprehensive repository health score and status.
 * @param {object} cachedData - from GitHubRepository.cachedData
 * @returns {{ score: number, status: string, indicators: object }}
 */
const calculateRepositoryHealth = (cachedData) => {
  if (!cachedData) {
    return { score: 0, status: 'Unknown', indicators: {} };
  }

  const {
    commits = [],
    pullRequests = [],
    issues = [],
    branches = [],
    contributors = [],
    hasReadme = false,
    tree = [],
    workflows = [],
    releases = []
  } = cachedData;

  let score = 0;
  const indicators = {};

  // ── Repository Connected (base) ──────────────────────────────────────────
  score += 10;
  indicators.connected = true;

  // ── Recent Commit Activity ───────────────────────────────────────────────
  const recentCommit24h = hasRecentCommits(commits, 24);
  const recentCommit72h = hasRecentCommits(commits, 72);
  const weekCommits = commitsInLastDays(commits, 7);

  if (recentCommit24h) { score += 25; indicators.commitActivity = 'Active (last 24h)'; }
  else if (recentCommit72h) { score += 15; indicators.commitActivity = 'Moderate (last 72h)'; }
  else if (weekCommits > 0) { score += 8; indicators.commitActivity = 'Low (last 7 days)'; }
  else { score += 0; indicators.commitActivity = 'No recent commits'; }

  // ── Branch Activity ──────────────────────────────────────────────────────
  if (branches.length >= 3) { score += 10; indicators.branchActivity = 'Multiple branches'; }
  else if (branches.length >= 2) { score += 6; indicators.branchActivity = 'Feature branching'; }
  else { score += 2; indicators.branchActivity = 'Single branch only'; }

  // ── Issue Status ─────────────────────────────────────────────────────────
  const openIssues = issues.filter(i => i.state === 'open').length;
  const closedIssues = issues.filter(i => i.state === 'closed').length;
  if (closedIssues > openIssues && closedIssues > 0) { score += 10; indicators.issueStatus = 'Issues resolved'; }
  else if (openIssues <= 5) { score += 6; indicators.issueStatus = 'Manageable issues'; }
  else { score += 2; indicators.issueStatus = `${openIssues} open issues`; }

  // ── Pull Request Status ──────────────────────────────────────────────────
  const mergedPRs = pullRequests.filter(p => p.state === 'closed').length;
  const openPRs = pullRequests.filter(p => p.state === 'open').length;
  if (mergedPRs >= 3) { score += 10; indicators.pullRequestStatus = 'Active PR workflow'; }
  else if (mergedPRs >= 1) { score += 6; indicators.pullRequestStatus = 'Some PRs merged'; }
  else if (openPRs > 0) { score += 3; indicators.pullRequestStatus = 'PRs in progress'; }
  else { score += 1; indicators.pullRequestStatus = 'No PRs'; }

  // ── README ───────────────────────────────────────────────────────────────
  if (hasReadme) { score += 10; indicators.readme = 'README present'; }
  else { indicators.readme = 'README missing'; }

  // ── Testing ──────────────────────────────────────────────────────────────
  const hasTesting = hasTestFiles(tree);
  if (hasTesting) { score += 10; indicators.testing = 'Tests found'; }
  else { indicators.testing = 'No tests detected'; }

  // ── Deployment Config ─────────────────────────────────────────────────────
  const hasDeployment = hasDeploymentConfig(tree);
  if (hasDeployment) { score += 10; indicators.deployment = 'Deployment config found'; }
  else { indicators.deployment = 'No deployment config'; }

  // ── CI/CD Workflows ──────────────────────────────────────────────────────
  if (workflows.length > 0) { score += 5; indicators.cicd = `${workflows.length} workflow(s) detected`; }
  else { indicators.cicd = 'No CI/CD workflows'; }

  // Clamp to 100
  score = Math.min(100, score);

  // Status thresholds
  let status = 'Unknown';
  if (score >= 80) status = 'Excellent';
  else if (score >= 60) status = 'Healthy';
  else if (score >= 35) status = 'Needs Attention';
  else status = 'Critical';

  return { score, status, indicators };
};

/**
 * Generate repository alerts based on health indicators and cached data.
 * @param {object} cachedData
 * @param {object} healthIndicators
 * @returns {Array<{ message: string, severity: string }>}
 */
const generateRepositoryAlerts = (cachedData, healthIndicators) => {
  const alerts = [];
  const {
    commits = [],
    contributors = [],
    issues = [],
    hasReadme = false,
    tree = []
  } = cachedData || {};

  if (!hasRecentCommits(commits, 48)) {
    alerts.push({ message: '⚠️ No commits in the last 48 hours. Development may have stalled.', severity: 'High' });
  }

  if (contributors.length === 1) {
    alerts.push({ message: '⚠️ Only one contributor is active. Bus-factor risk: single point of failure.', severity: 'Medium' });
  }

  if (!hasReadme) {
    alerts.push({ message: '📄 README is missing. Add documentation before submission.', severity: 'Medium' });
  }

  if (!hasTestFiles(tree)) {
    alerts.push({ message: '🧪 No test files detected. Testing not started.', severity: 'Medium' });
  }

  if (!hasDeploymentConfig(tree)) {
    alerts.push({ message: '🚀 No deployment configuration found. Deployment planning required.', severity: 'High' });
  }

  const openIssues = issues.filter(i => i.state === 'open').length;
  if (openIssues > 10) {
    alerts.push({ message: `🐛 ${openIssues} open issues detected. Too many unresolved issues.`, severity: 'High' });
  }

  return alerts;
};

module.exports = {
  calculateRepositoryHealth,
  buildContributorActivity,
  buildCommitSummary,
  generateRepositoryAlerts,
  commitsToday,
  commitsInLastDays,
  hasRecentCommits,
  hasDeploymentConfig,
  hasTestFiles
};
