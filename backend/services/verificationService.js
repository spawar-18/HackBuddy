const Project = require('../models/Project');
const Team = require('../models/Team');
const GitHubRepository = require('../models/GitHubRepository');
const TaskVerification = require('../models/TaskVerification');
const githubService = require('./githubService');
const { calculateRepositoryHealth } = require('./repoHealthService');
const { verifyTaskWithAI } = require('./aiVerificationService');
const Notification = require('../models/Notification');

// In-memory cache for detailed commit files to prevent excessive API requests
const commitFilesCache = new Map();

/**
 * Fetch and cache files changed in a commit.
 */
const getCommitFiles = async (owner, repo, sha) => {
  if (commitFilesCache.has(sha)) {
    return commitFilesCache.get(sha);
  }
  try {
    const detail = await githubService.fetchCommitDetail(owner, repo, sha);
    const files = (detail?.files || []).map(f => f.filename);
    commitFilesCache.set(sha, files);
    return files;
  } catch (err) {
    console.warn(`[VerificationService] Could not fetch details for commit ${sha}:`, err.message);
    return [];
  }
};

/**
 * Build rich GitHub context for AI Task Verification.
 */
const buildGitHubContext = async (projectId) => {
  const repoDoc = await GitHubRepository.findOne({ projectId });
  if (!repoDoc || repoDoc.connectionStatus === 'Disconnected') {
    return null;
  }

  const cachedData = repoDoc.cachedData || {};
  const commits = cachedData.commits || [];

  // Fetch file changes for the latest 10 commits to build changed files list
  const recentCommits = commits.slice(0, 10).map(c => ({
    sha: c.sha,
    message: c.commit?.message || '',
    author: c.commit?.author?.name || c.author?.login || 'Unknown',
    date: c.commit?.author?.date || null
  }));

  const changedFilesSet = new Set();
  const modifiedFoldersSet = new Set();

  for (const c of recentCommits) {
    const files = await getCommitFiles(repoDoc.owner, repoDoc.repository, c.sha);
    files.forEach(file => {
      changedFilesSet.add(file);
      const parts = file.split('/');
      if (parts.length > 1) {
        modifiedFoldersSet.add(parts.slice(0, -1).join('/'));
      }
    });
  }

  const { score: healthScore, status: healthStatus } = calculateRepositoryHealth(cachedData);

  const testPatterns = ['test', 'spec', 'jest', 'vitest', 'cypress', '__tests__'];
  const deployPatterns = ['dockerfile', 'docker-compose', 'heroku', 'vercel', 'netlify', 'render', 'fly.toml', '.github/workflows'];

  const filePaths = (cachedData.tree || []).map(f => (f.path || '').toLowerCase());
  const hasTests = testPatterns.some(p => filePaths.some(fp => fp.includes(p)));
  const hasDeployment = deployPatterns.some(p => filePaths.some(fp => fp.includes(p)));

  return {
    repositoryName: `${repoDoc.owner}/${repoDoc.repository}`,
    repositoryHealthScore: healthScore,
    repositoryHealthStatus: healthStatus,
    hasReadme: cachedData.hasReadme || false,
    hasTests,
    hasDeployment,
    recentCommits,
    changedFiles: Array.from(changedFilesSet),
    modifiedFolders: Array.from(modifiedFoldersSet),
    tree: cachedData.tree || []
  };
};

/**
 * Safely get or create a TaskVerification document, preventing concurrent unique key collision (E11000).
 */
const getOrCreateVerification = async (projectId, memberName, taskName) => {
  let verifDoc = await TaskVerification.findOne({ projectId, memberName, taskName });
  if (!verifDoc) {
    try {
      verifDoc = await TaskVerification.create({
        projectId,
        memberName,
        taskName,
        timeline: []
      });
    } catch (createErr) {
      if (createErr.code === 11000 || createErr.message?.includes('E11000')) {
        verifDoc = await TaskVerification.findOne({ projectId, memberName, taskName });
        if (!verifDoc) {
          throw new Error('Task verification record creation conflict, please retry.');
        }
      } else {
        throw createErr;
      }
    }
  }
  return verifDoc;
};

/**
 * Verify a completed task.
 */
const verifyTask = async (projectId, memberName, taskName, requestingUser = null) => {
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  if (!project.taskPlan || !project.taskPlan.assignments) {
    throw new Error('No task plan exists for this project');
  }

  // Find task entry to get description & priority
  let taskEntry = null;
  for (const assign of project.taskPlan.assignments) {
    if (assign.member === memberName) {
      taskEntry = assign.assignedTasks.find(t => t.task === taskName);
      break;
    }
  }

  if (!taskEntry) {
    throw new Error(`Task "${taskName}" assigned to ${memberName} not found in project plan`);
  }

  // Initialize or fetch the verification record safely
  let verifDoc = await getOrCreateVerification(projectId, memberName, taskName);

  // If overridden by owner, skip AI unless explicitly forced
  if (verifDoc.overridden) {
    console.log(`[VerificationService] Task "${taskName}" is overridden. Skipping AI verification.`);
    return verifDoc;
  }

  // Prevent concurrent duplicate verification runs
  if (verifDoc.verificationStatus === 'Pending Verification') {
    const lastUpdated = verifDoc.updatedAt || verifDoc.lastVerifiedAt || new Date();
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (lastUpdated > twoMinutesAgo) {
      console.log(`[VerificationService] Task "${taskName}" verification is already in progress. Returning existing record.`);
      return verifDoc;
    }
  }

  // Add Verification Started to timeline
  verifDoc.timeline.push({
    status: 'Verification Started',
    details: `Task verification started for "${taskName}" completed by ${memberName}.`
  });
  verifDoc.verificationStatus = 'Pending Verification';
  await verifDoc.save();

  // Build GitHub Context
  const gitHubContext = await buildGitHubContext(projectId);

  if (!gitHubContext) {
    // Fetch fresh copy to avoid potential VersionErrors
    let freshDoc = verifDoc;
    try {
      const dbDoc = await TaskVerification.findOne({ projectId, memberName, taskName });
      if (dbDoc) freshDoc = dbDoc;
    } catch (e) {
      console.warn('[VerificationService] Failed to fetch fresh doc before cannot verify save:', e.message);
    }

    freshDoc.verificationStatus = 'Cannot Verify';
    freshDoc.confidence = 0;
    freshDoc.reasoning = 'No GitHub repository connected to this project.';
    freshDoc.recommendation = 'Connect a GitHub repository to enable automated verification.';
    freshDoc.timeline.push({
      status: 'Verification Finished',
      details: 'Automated verification failed: No connected GitHub repository.'
    });
    freshDoc.lastVerifiedAt = new Date();
    await freshDoc.save();
    return freshDoc;
  }

  // Run AI analysis
  try {
    const aiResult = await verifyTaskWithAI({
      projectDetails: {
        problemStatement: project.problemStatement,
        featuresToBuild: project.featuresToBuild,
        finalTechStack: project.finalTechStack
      },
      taskDetails: {
        taskName,
        taskDescription: taskEntry.description || '',
        taskPriority: taskEntry.priority || 'Medium',
        memberName
      },
      gitHubContext
    });

    // Fetch fresh copy from database to avoid VersionError and check for manual overrides in the meantime
    let freshDoc = verifDoc;
    try {
      const dbDoc = await TaskVerification.findOne({ projectId, memberName, taskName });
      if (dbDoc) freshDoc = dbDoc;
    } catch (e) {
      console.warn('[VerificationService] Failed to fetch fresh doc before save:', e.message);
    }

    if (freshDoc.overridden) {
      console.log(`[VerificationService] Task "${taskName}" was overridden during AI verification. Skipping save.`);
      return freshDoc;
    }

    freshDoc.verificationStatus = aiResult.verificationStatus;
    freshDoc.confidence = aiResult.confidence;
    freshDoc.matchedFiles = aiResult.matchedFiles;
    freshDoc.matchedCommits = aiResult.matchedCommits;
    freshDoc.reasoning = aiResult.reasoning;
    freshDoc.missingEvidence = aiResult.missingEvidence;
    freshDoc.recommendation = aiResult.recommendation;
    freshDoc.lastVerifiedAt = new Date();
    freshDoc.timeline.push({
      status: 'Verification Finished',
      details: `Automated verification completed: Status set to "${aiResult.verificationStatus}" with ${aiResult.confidence}% confidence.`
    });

    await freshDoc.save();

    // Create Notification
    let notificationType = 'General';
    if (aiResult.verificationStatus === 'Cannot Verify') notificationType = 'ActionRequired';
    else if (aiResult.verificationStatus === 'Verified') notificationType = 'Milestone';

    await Notification.create({
      projectId,
      message: `🤖 Task "${taskName}" completed by ${memberName} was verified by AI: ${aiResult.verificationStatus} (${aiResult.confidence}% confidence).`,
      type: notificationType
    });

    return freshDoc;
  } catch (err) {
    console.error('[VerificationService] AI verification failed:', err.message);

    let errorDoc = verifDoc;
    try {
      const dbDoc = await TaskVerification.findOne({ projectId, memberName, taskName });
      if (dbDoc) errorDoc = dbDoc;
    } catch (e) {
      console.warn('[VerificationService] Failed to fetch fresh doc in catch:', e.message);
    }

    if (!errorDoc.overridden) {
      errorDoc.verificationStatus = 'Needs Manual Review';
      errorDoc.reasoning = `AI verification failed: ${err.message}`;
      errorDoc.timeline.push({
        status: 'Verification Finished',
        details: `Automated verification errored: ${err.message}`
      });
      await errorDoc.save();
    }
    return errorDoc;
  }
};

/**
 * Override task verification result (Owner only).
 */
const overrideVerification = async (projectId, memberName, taskName, status, reason, user) => {
  let verifDoc = await getOrCreateVerification(projectId, memberName, taskName);

  verifDoc.verificationStatus = status;
  verifDoc.confidence = status === 'Verified' ? 100 : status === 'Partially Verified' ? 70 : 0;
  verifDoc.overridden = true;
  verifDoc.overrideReason = reason;
  verifDoc.overriddenBy = user._id;
  verifDoc.overriddenAt = new Date();
  verifDoc.timeline.push({
    status: 'Verification Overridden',
    details: `Override triggered by ${user.name || 'Owner'}. Status set to "${status}". Reason: ${reason}`
  });

  await verifDoc.save();

  await Notification.create({
    projectId,
    message: `🛡️ Task "${taskName}" verification status was manually overridden by Project Owner to "${status}".`,
    type: 'General'
  });

  return verifDoc;
};

/**
 * Calculate Project Reality Score.
 */
const getProjectRealityScore = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  let completedTasks = 0;
  if (project.taskPlan && project.taskPlan.assignments) {
    project.taskPlan.assignments.forEach(assign => {
      (assign.assignedTasks || []).forEach(t => {
        if (t.status === 'Completed') completedTasks++;
      });
    });
  }

  const verifications = await TaskVerification.find({ projectId });
  const verifiedCount = verifications.filter(v => v.verificationStatus === 'Verified').length;
  const partiallyVerifiedCount = verifications.filter(v => v.verificationStatus === 'Partially Verified').length;
  const cannotVerifyCount = verifications.filter(v => v.verificationStatus === 'Cannot Verify').length;
  const needsReviewCount = verifications.filter(v => v.verificationStatus === 'Needs Manual Review').length;

  let realityScore = 100;
  if (completedTasks > 0) {
    realityScore = Math.round(((verifiedCount * 1.0 + partiallyVerifiedCount * 0.5) / completedTasks) * 100);
    realityScore = Math.min(100, Math.max(0, realityScore));
  }

  return {
    completedTasks,
    verifiedCount,
    partiallyVerifiedCount,
    cannotVerifyCount,
    needsReviewCount,
    realityScore
  };
};

/**
 * Generate verification alert conditions.
 */
const generateVerificationAlerts = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return [];

  const alerts = [];
  const verifications = await TaskVerification.find({ projectId });

  const repoDoc = await GitHubRepository.findOne({ projectId });
  const cachedData = repoDoc?.cachedData || {};
  const filePaths = (cachedData.tree || []).map(f => (f.path || '').toLowerCase());

  // Check specific completed tasks
  if (project.taskPlan && project.taskPlan.assignments) {
    for (const assign of project.taskPlan.assignments) {
      for (const t of assign.assignedTasks) {
        if (t.status !== 'Completed') continue;

        const name = t.task.toLowerCase();
        const v = verifications.find(ver => ver.taskName === t.task && ver.memberName === assign.member);
        const status = v?.verificationStatus || 'Pending Verification';

        if (name.includes('auth') || name.includes('jwt')) {
          const hasAuthFiles = filePaths.some(fp => fp.includes('auth') || fp.includes('jwt') || fp.includes('passport'));
          if (!hasAuthFiles && status !== 'Verified') {
            alerts.push({
              message: `⚠️ Authentication marked complete by ${assign.member} but no authentication files detected in repository.`,
              priority: 'High',
              task: t.task,
              member: assign.member
            });
          }
        }

        if (name.includes('deploy') || name.includes('host')) {
          const deployFiles = ['dockerfile', 'docker-compose', 'heroku', 'vercel', 'netlify', 'render', 'fly.toml', '.github/workflows'];
          const hasDeployFiles = deployFiles.some(p => filePaths.some(fp => fp.includes(p)));
          if (!hasDeployFiles && status !== 'Verified') {
            alerts.push({
              message: `🚀 Deployment task completed by ${assign.member} but deployment configuration is missing from repository.`,
              priority: 'High',
              task: t.task,
              member: assign.member
            });
          }
        }

        if (name.includes('test') || name.includes('spec')) {
          const testFiles = ['test', 'spec', 'jest', 'vitest', 'cypress', '__tests__'];
          const hasTestFiles = testFiles.some(p => filePaths.some(fp => fp.includes(p)));
          if (!hasTestFiles && status !== 'Verified') {
            alerts.push({
              message: `🧪 Testing marked completed by ${assign.member} but no test suite/files detected in repository.`,
              priority: 'High',
              task: t.task,
              member: assign.member
            });
          }
        }

        if (name.includes('readme') || name.includes('document')) {
          if (!cachedData.hasReadme && status !== 'Verified') {
            alerts.push({
              message: `📄 README completed by ${assign.member} but documentation README.md is still missing or incomplete.`,
              priority: 'Medium',
              task: t.task,
              member: assign.member
            });
          }
        }
      }
    }
  }

  return alerts;
};

module.exports = {
  buildGitHubContext,
  verifyTask,
  overrideVerification,
  getProjectRealityScore,
  generateVerificationAlerts
};
