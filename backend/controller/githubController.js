/**
 * GitHub Repository Controller
 * ===============================
 * Handles all GitHub repository API endpoints:
 * - Connect / Disconnect repository (Owner only)
 * - Get repository analytics
 * - Manual sync trigger (Owner only)
 * - AI repository analysis
 * - Project Reality Check (Task vs Commits)
 */

const Project = require('../models/Project');
const Team = require('../models/Team');
const GitHubRepository = require('../models/GitHubRepository');
const { syncRepository, connectRepository } = require('../services/githubSyncService');
const {
  calculateRepositoryHealth,
  buildContributorActivity,
  buildCommitSummary,
  generateRepositoryAlerts,
  hasDeploymentConfig,
  hasTestFiles
} = require('../services/repoHealthService');
const { analyzeGitHubRepositoryWithAI } = require('../services/aiService');
const Notification = require('../models/Notification');
const github = require('../services/githubService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSameUser = (id1, id2) => {
  const s1 = id1?._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2?._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

const verifyProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });

  const team = await Team.findById(project.teamId).populate('members', 'name skills avatar');
  if (!team) throw Object.assign(new Error('Team not found'), { status: 404 });

  const isMember = team.members.some(m => isSameUser(m, userId));
  if (!isMember) throw Object.assign(new Error('Access denied: Not a team member'), { status: 403 });

  const isOwner = isSameUser(project.createdBy, userId) || isSameUser(team.createdBy, userId);
  return { project, team, isOwner };
};

// ─── Connect Repository ──────────────────────────────────────────────────────

/**
 * POST /api/projects/:projectId/hackathon/github/connect
 * Owner only – connect a GitHub repository
 */
exports.connectRepository = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { owner, repository, defaultBranch, repositoryUrl } = req.body;

    if (!owner || !repository) {
      return res.status(400).json({ success: false, message: 'Owner and repository name are required' });
    }

    const { project, isOwner } = await verifyProjectAccess(projectId, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only the Team Owner can connect a repository' });
    }

    const repoDoc = await connectRepository({
      projectId,
      owner: owner.trim(),
      repository: repository.trim(),
      defaultBranch: defaultBranch?.trim() || 'main',
      repositoryUrl: repositoryUrl?.trim() || `https://github.com/${owner.trim()}/${repository.trim()}`,
      connectedBy: req.user.id
    });

    // Create in-app notification
    await Notification.create({
      projectId,
      message: `🔗 GitHub repository "${owner}/${repository}" connected by Team Owner. Initial sync in progress...`,
      type: 'General'
    });

    return res.status(200).json({
      success: true,
      message: 'Repository connected successfully. Initial sync started.',
      repository: {
        owner: repoDoc.owner,
        repository: repoDoc.repository,
        defaultBranch: repoDoc.defaultBranch,
        repositoryUrl: repoDoc.repositoryUrl,
        connectionStatus: repoDoc.connectionStatus,
        connectedAt: repoDoc.connectedAt
      }
    });
  } catch (err) {
    console.error('connectRepository error:', err);
    const status = err.status || 500;
    const msg = err.message?.includes('not found on GitHub')
      ? err.message
      : err.message?.includes('private')
        ? err.message
        : (err.message || 'Server error connecting repository');
    return res.status(status).json({ success: false, message: msg });
  }
};

// ─── Disconnect Repository ───────────────────────────────────────────────────

/**
 * DELETE /api/projects/:projectId/hackathon/github/disconnect
 * Owner only – disconnect a GitHub repository
 */
exports.disconnectRepository = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { isOwner } = await verifyProjectAccess(projectId, req.user.id);

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only the Team Owner can disconnect a repository' });
    }

    const repoDoc = await GitHubRepository.findOne({ projectId });
    if (!repoDoc) {
      return res.status(404).json({ success: false, message: 'No repository connected to this project' });
    }

    repoDoc.connectionStatus = 'Disconnected';
    await repoDoc.save();

    await Notification.create({
      projectId,
      message: `🔌 GitHub repository "${repoDoc.owner}/${repoDoc.repository}" disconnected by Team Owner.`,
      type: 'General'
    });

    return res.status(200).json({ success: true, message: 'Repository disconnected successfully' });
  } catch (err) {
    console.error('disconnectRepository error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ─── Get Repository Status (lightweight) ─────────────────────────────────────

/**
 * GET /api/projects/:projectId/hackathon/github/status
 * Any member – get connection status + last sync time
 */
exports.getRepositoryStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    await verifyProjectAccess(projectId, req.user.id);

    const repoDoc = await GitHubRepository.findOne({ projectId });
    if (!repoDoc || repoDoc.connectionStatus === 'Disconnected') {
      return res.status(200).json({ success: true, connected: false });
    }

    return res.status(200).json({
      success: true,
      connected: true,
      owner: repoDoc.owner,
      repository: repoDoc.repository,
      defaultBranch: repoDoc.defaultBranch,
      repositoryUrl: repoDoc.repositoryUrl,
      repositoryVisibility: repoDoc.repositoryVisibility,
      connectionStatus: repoDoc.connectionStatus,
      connectedAt: repoDoc.connectedAt,
      lastSyncedAt: repoDoc.lastSyncedAt,
      healthStatus: repoDoc.healthStatus,
      healthScore: repoDoc.healthScore
    });
  } catch (err) {
    console.error('getRepositoryStatus error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ─── Get Full Repository Analytics ───────────────────────────────────────────

/**
 * GET /api/projects/:projectId/hackathon/github/analytics
 * Any member – get full analytics from cached data
 * Triggers a sync if data is stale
 */
exports.getRepositoryAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { project, isOwner } = await verifyProjectAccess(projectId, req.user.id);

    let repoDoc = await GitHubRepository.findOne({ projectId });
    if (!repoDoc || repoDoc.connectionStatus === 'Disconnected') {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'No GitHub repository connected to this project.'
      });
    }

    // Auto-sync if data is stale (non-blocking on the response, but awaited for fresh data)
    const SYNC_THRESHOLD_MS = 12 * 60 * 1000;
    const needsSyncNow = !repoDoc.lastSyncedAt ||
      (Date.now() - new Date(repoDoc.lastSyncedAt).getTime() > SYNC_THRESHOLD_MS);

    if (needsSyncNow) {
      try {
        repoDoc = await syncRepository(projectId, false);
      } catch (syncErr) {
        console.warn('[GitHub Analytics] Auto-sync failed:', syncErr.message);
        // Continue with cached data
      }
    }

    const cachedData = repoDoc.cachedData || {};

    // Compute health
    const { score: healthScore, status: healthStatus, indicators: healthIndicators } =
      calculateRepositoryHealth(cachedData);

    // Update health on document
    repoDoc.healthScore = healthScore;
    repoDoc.healthStatus = healthStatus;
    await repoDoc.save();

    // Build rich data summaries
    const commitSummary = buildCommitSummary(cachedData.commits);
    const contributorActivity = buildContributorActivity(cachedData.contributors, cachedData.commits);
    const repositoryAlerts = generateRepositoryAlerts(cachedData, healthIndicators);

    const openPRs = (cachedData.pullRequests || []).filter(p => p.state === 'open');
    const closedPRs = (cachedData.pullRequests || []).filter(p => p.state === 'closed');
    const openIssues = (cachedData.issues || []).filter(i => i.state === 'open');

    // Slim down commits for response (avoid sending massive payloads)
    const recentCommitsDisplay = (cachedData.commits || []).slice(0, 15).map(c => ({
      sha: c.sha?.slice(0, 7),
      message: c.commit?.message?.split('\n')[0] || '',
      author: c.commit?.author?.name || c.author?.login || 'Unknown',
      date: c.commit?.author?.date || null,
      url: c.html_url || null
    }));

    return res.status(200).json({
      success: true,
      connected: true,
      isOwner,
      owner: repoDoc.owner,
      repository: repoDoc.repository,
      defaultBranch: repoDoc.defaultBranch,
      repositoryUrl: repoDoc.repositoryUrl,
      repositoryVisibility: repoDoc.repositoryVisibility,
      connectionStatus: repoDoc.connectionStatus,
      connectedAt: repoDoc.connectedAt,
      lastSyncedAt: repoDoc.lastSyncedAt,

      // Health
      healthScore,
      healthStatus,
      healthIndicators,

      // Statistics
      stats: {
        totalCommits: cachedData.repoInfo?.pushed_at ? commitSummary.totalFetched : 0,
        commitsToday: commitSummary.commitsToday,
        last7DaysCommits: commitSummary.last7Days,
        openPRCount: openPRs.length,
        closedPRCount: closedPRs.length,
        openIssueCount: openIssues.length,
        branchCount: (cachedData.branches || []).length,
        contributorCount: (cachedData.contributors || []).length,
        releaseCount: (cachedData.releases || []).length,
        workflowCount: (cachedData.workflows || []).length,
        hasReadme: cachedData.hasReadme,
        hasTests: hasTestFiles(cachedData.tree),
        hasDeployment: hasDeploymentConfig(cachedData.tree)
      },

      // Commit data
      commitSummary,
      recentCommits: recentCommitsDisplay,

      // Contributors
      contributors: contributorActivity,

      // PR & Issues
      openPullRequests: openPRs.slice(0, 10).map(p => ({
        number: p.number,
        title: p.title,
        author: p.user?.login || 'Unknown',
        createdAt: p.created_at,
        url: p.html_url
      })),
      openIssues: openIssues.slice(0, 10).map(i => ({
        number: i.number,
        title: i.title,
        author: i.user?.login || 'Unknown',
        createdAt: i.created_at,
        url: i.html_url
      })),

      // Languages
      languages: cachedData.languages || {},

      // Branches
      branches: (cachedData.branches || []).map(b => b.name),

      // Alerts
      repositoryAlerts,

      // AI Analysis
      aiAnalysis: repoDoc.aiAnalysis || null,
      aiAnalysisGeneratedAt: repoDoc.aiAnalysisGeneratedAt || null
    });
  } catch (err) {
    console.error('getRepositoryAnalytics error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ─── Manual Sync ──────────────────────────────────────────────────────────────

/**
 * POST /api/projects/:projectId/hackathon/github/sync
 * Owner only – force a fresh sync from GitHub
 */
exports.manualSync = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { isOwner } = await verifyProjectAccess(projectId, req.user.id);

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only the Team Owner can manually sync the repository' });
    }

    const repoDoc = await GitHubRepository.findOne({ projectId });
    if (!repoDoc || repoDoc.connectionStatus === 'Disconnected') {
      return res.status(404).json({ success: false, message: 'No repository connected to this project' });
    }

    const synced = await syncRepository(projectId, true); // force = true

    return res.status(200).json({
      success: true,
      message: 'Repository synced successfully',
      lastSyncedAt: synced.lastSyncedAt,
      connectionStatus: synced.connectionStatus
    });
  } catch (err) {
    console.error('manualSync error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ─── AI Repository Analysis ───────────────────────────────────────────────────

/**
 * POST /api/projects/:projectId/hackathon/github/analyze
 * Any member – trigger AI analysis of the repository
 */
exports.triggerRepositoryAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { project } = await verifyProjectAccess(projectId, req.user.id);

    const repoDoc = await GitHubRepository.findOne({ projectId });
    if (!repoDoc || repoDoc.connectionStatus === 'Disconnected') {
      return res.status(404).json({ success: false, message: 'No repository connected to this project' });
    }

    const cachedData = repoDoc.cachedData || {};
    const { score: healthScore, status: healthStatus, indicators: healthIndicators } =
      calculateRepositoryHealth(cachedData);

    const commitSummary = buildCommitSummary(cachedData.commits);
    const contributorActivity = buildContributorActivity(cachedData.contributors, cachedData.commits);
    const repositoryAlerts = generateRepositoryAlerts(cachedData, healthIndicators);

    const openIssues = (cachedData.issues || []).filter(i => i.state === 'open').length;

    // Calculate hackathon time remaining
    const HackathonConfig = require('../models/HackathonConfig');
    const hackConfig = await HackathonConfig.findOne({ projectId });
    let timeRemaining = 'Unknown';
    if (hackConfig?.endTime) {
      const diffMs = new Date(hackConfig.endTime) - new Date();
      const hoursLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
      timeRemaining = `${hoursLeft} hour(s) remaining`;
    }

    // Task progress
    const assignments = project.taskPlan?.assignments || [];
    const totalTasks = assignments.reduce((s, a) => s + (a.assignedTasks?.length || 0), 0);
    const completedTasks = assignments.reduce((s, a) =>
      s + (a.assignedTasks?.filter(t => t.status === 'Completed')?.length || 0), 0);

    // Dynamic repo parsing: Fetch actual file tree and contents of package.json, README, and key code files
    console.log(`[GitHub AI Analyze] Fetching codebase files from ${repoDoc.owner}/${repoDoc.repository} for deep AI parsing...`);
    const readmeData = await github.fetchReadme(repoDoc.owner, repoDoc.repository, true).catch(() => null);
    const readmeContent = readmeData?.content || '';

    const packageJsonPath = (cachedData.tree || []).find(f => f.path.toLowerCase() === 'package.json')?.path;
    let packageJsonContent = '';
    if (packageJsonPath) {
      packageJsonContent = await github.fetchFileContent(repoDoc.owner, repoDoc.repository, packageJsonPath, repoDoc.defaultBranch, true).catch(() => '');
    }

    const entrypointCandidates = [
      'server.js',
      'app.js',
      'index.js',
      'src/App.jsx',
      'src/App.js',
      'src/index.js',
      'main.py',
      'app.py',
      'main.go'
    ];

    const matchingPaths = (cachedData.tree || [])
      .filter(f => f.type === 'blob' && entrypointCandidates.some(c => f.path.toLowerCase() === c))
      .slice(0, 3)
      .map(f => f.path);

    const entrypointCodeContents = [];
    for (const filePath of matchingPaths) {
      try {
        const fileContent = await github.fetchFileContent(repoDoc.owner, repoDoc.repository, filePath, repoDoc.defaultBranch, true);
        if (fileContent) {
          entrypointCodeContents.push({
            path: filePath,
            content: fileContent.slice(0, 3000)
          });
        }
      } catch (fileErr) {
        console.warn(`[GitHub AI Analyze] Failed to fetch content for ${filePath}:`, fileErr.message);
      }
    }

    // Build the full AI context
    const aiContext = {
      projectDetails: {
        projectName: project.projectName,
        problemStatement: project.problemStatement,
        featuresToBuild: project.featuresToBuild
      },
      finalTechStack: project.finalTechStack,
      taskPlan: project.taskPlan,
      timeRemaining,
      commitSummary,
      contributors: contributorActivity,
      pullRequests: cachedData.pullRequests || [],
      openIssues,
      languages: cachedData.languages || {},
      hasReadme: cachedData.hasReadme || false,
      hasTestFiles: hasTestFiles(cachedData.tree),
      hasDeployment: hasDeploymentConfig(cachedData.tree),
      healthScore,
      healthStatus,
      healthIndicators,
      repositoryAlerts,
      completedTasks,
      totalTasks,
      previousAiRecommendations: (repoDoc.aiAnalysis?.recommendations || []),
      
      // Dynamic repository parsed details
      tree: cachedData.tree || [],
      readmeContent,
      packageJsonContent,
      entrypointCodeContents
    };

    let aiAnalysis;
    try {
      aiAnalysis = await analyzeGitHubRepositoryWithAI(aiContext);
    } catch (aiErr) {
      console.error('GitHub AI analysis failed:', aiErr.message);
      return res.status(502).json({ success: false, message: 'AI analysis failed. Try again.' });
    }

    // Store AI analysis
    repoDoc.aiAnalysis = aiAnalysis;
    repoDoc.aiAnalysisGeneratedAt = new Date();
    repoDoc.healthScore = healthScore;
    repoDoc.healthStatus = healthStatus;
    repoDoc.markModified('aiAnalysis');
    await repoDoc.save();

    // Create notification
    await Notification.create({
      projectId,
      message: `🤖 GitHub AI Analysis complete. Repository Health: "${aiAnalysis.repositoryHealth}". Status: "${aiAnalysis.developmentStatus}"`,
      type: 'General'
    });

    return res.status(200).json({
      success: true,
      aiAnalysis,
      healthScore,
      healthStatus
    });
  } catch (err) {
    console.error('triggerRepositoryAnalysis error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ─── Project Reality Check ────────────────────────────────────────────────────

/**
 * GET /api/projects/:projectId/hackathon/github/reality-check
 * Any member – compare task plan vs actual GitHub activity
 */
exports.getProjectRealityCheck = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { project } = await verifyProjectAccess(projectId, req.user.id);

    const repoDoc = await GitHubRepository.findOne({ projectId });
    if (!repoDoc || repoDoc.connectionStatus === 'Disconnected') {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'Connect a GitHub repository to enable Project Reality Check'
      });
    }

    const cachedData = repoDoc.cachedData || {};
    const commits = cachedData.commits || [];

    // Build commit message text for keyword matching
    const allCommitMessages = commits.map(c =>
      (c.commit?.message || '').toLowerCase()
    );

    const assignments = project.taskPlan?.assignments || [];
    const realityChecks = [];

    assignments.forEach(assignment => {
      (assignment.assignedTasks || []).forEach(task => {
        const taskLower = task.task.toLowerCase();
        const keywords = taskLower.split(/\s+/).filter(w => w.length > 3);

        // Find related commits
        const relatedCommits = allCommitMessages.filter(msg =>
          keywords.some(kw => msg.includes(kw))
        );

        let verdict = 'No Data';
        let message = '';

        if (task.status === 'Completed') {
          if (relatedCommits.length > 0) {
            verdict = 'Verified';
            message = `✅ Task marked complete with ${relatedCommits.length} related commit(s) found.`;
          } else {
            verdict = 'Warning';
            message = `⚠️ Task marked complete but no related commits found. Verify this was committed to the repository.`;
          }
        } else if (task.status === 'In Progress') {
          if (relatedCommits.length > 0) {
            verdict = 'Active';
            message = `🔄 ${relatedCommits.length} related commit(s) found. Task appears in progress.`;
          } else {
            verdict = 'No Activity';
            message = `⚠️ Task is In Progress but no related commits detected yet.`;
          }
        } else {
          // Not Started
          if (relatedCommits.length > 0) {
            verdict = 'Ahead';
            message = `💡 Commits found related to this task even though it's marked Not Started. Consider updating status.`;
          } else {
            verdict = 'Not Started';
            message = `Task not yet started. No related commits found.`;
          }
        }

        realityChecks.push({
          member: assignment.member,
          task: task.task,
          taskStatus: task.status,
          relatedCommitCount: relatedCommits.length,
          verdict,
          message
        });
      });
    });

    const summary = {
      total: realityChecks.length,
      verified: realityChecks.filter(r => r.verdict === 'Verified').length,
      warnings: realityChecks.filter(r => r.verdict === 'Warning').length,
      active: realityChecks.filter(r => r.verdict === 'Active').length,
      noActivity: realityChecks.filter(r => r.verdict === 'No Activity').length,
      notStarted: realityChecks.filter(r => r.verdict === 'Not Started').length,
      ahead: realityChecks.filter(r => r.verdict === 'Ahead').length
    };

    return res.status(200).json({
      success: true,
      connected: true,
      realityChecks,
      summary,
      lastSyncedAt: repoDoc.lastSyncedAt
    });
  } catch (err) {
    console.error('getProjectRealityCheck error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};
