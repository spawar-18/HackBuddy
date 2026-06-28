const mongoose = require('mongoose');

/**
 * GitHubAnalyzer
 * Analyzes repository status, commits, pull requests, issues, and branches.
 */
class GitHubAnalyzer {
  async analyze(projectId) {
    try {
      // Fetch git analytics from database if available
      const db = mongoose.connection.db;
      const repoAnalytics = await db.collection('github_analytics').findOne({ projectId: mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId });

      if (!repoAnalytics) {
        return {
          connected: false,
          healthScore: 50,
          commitsCount: 0,
          branchesCount: 0,
          pullRequestsCount: 0,
          issuesCount: 0,
          recentCommits: [],
          recentPRs: [],
          recentIssues: [],
          developerStats: []
        };
      }

      const commits = repoAnalytics.commits || [];
      const prs = repoAnalytics.pullRequests || [];
      const issues = repoAnalytics.issues || [];
      const branches = repoAnalytics.branches || [];

      // Calculate developer statistics based on commits
      const devMap = {};
      commits.forEach(c => {
        const author = c.author || 'Unknown';
        if (!devMap[author]) {
          devMap[author] = { commitsCount: 0, filesChanged: 0, impactScore: 0 };
        }
        devMap[author].commitsCount++;
        devMap[author].filesChanged += (c.filesChanged || 1);
        devMap[author].impactScore += (c.additions || 0) * 0.1 + (c.deletions || 0) * 0.05;
      });

      const developerStats = Object.entries(devMap).map(([developer, stats]) => ({
        developer,
        commitsCount: stats.commitsCount,
        filesChanged: stats.filesChanged,
        impactScore: Math.round(stats.impactScore)
      }));

      return {
        connected: true,
        healthScore: repoAnalytics.repositoryHealthScore || 70,
        commitsCount: commits.length,
        branchesCount: branches.length,
        pullRequestsCount: prs.length,
        issuesCount: issues.length,
        recentCommits: commits.slice(0, 5),
        recentPRs: prs.slice(0, 5),
        recentIssues: issues.slice(0, 5),
        developerStats
      };
    } catch (err) {
      console.warn('[GitHubAnalyzer] Error during analysis:', err.message);
      return {
        connected: false,
        healthScore: 50,
        commitsCount: 0,
        branchesCount: 0,
        pullRequestsCount: 0,
        issuesCount: 0,
        recentCommits: [],
        recentPRs: [],
        recentIssues: [],
        developerStats: []
      };
    }
  }
}

module.exports = new GitHubAnalyzer();
