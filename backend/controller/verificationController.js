const Project = require('../models/Project');
const Team = require('../models/Team');
const TaskVerification = require('../models/TaskVerification');
const {
  verifyTask,
  overrideVerification,
  getProjectRealityScore,
  generateVerificationAlerts
} = require('../services/verificationService');

const isSameUser = (id1, id2) => {
  const s1 = id1?._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2?._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

const verifyProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  const team = await Team.findById(project.teamId).populate('members', 'name skills avatar');
  if (!team) {
    const error = new Error('Team not found');
    error.status = 404;
    throw error;
  }

  const isMember = team.members.some(m => isSameUser(m, userId));
  if (!isMember) {
    const error = new Error('Access denied: Not a team member');
    error.status = 403;
    throw error;
  }

  const isOwner = isSameUser(project.createdBy, userId) || isSameUser(team.createdBy, userId);
  return { project, team, isOwner };
};

/**
 * Verify a completed task.
 * POST /api/projects/:projectId/verification/verify
 */
exports.verifyCompletedTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { memberName, taskName } = req.body;

    if (!memberName || !taskName) {
      return res.status(400).json({ success: false, message: 'memberName and taskName are required' });
    }

    await verifyProjectAccess(projectId, req.user.id);

    const verificationResult = await verifyTask(projectId, memberName, taskName, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Verification complete',
      verification: verificationResult
    });
  } catch (err) {
    console.error('verifyCompletedTask error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Override a verification status (Owner only).
 * POST /api/projects/:projectId/verification/override
 */
exports.overrideTaskVerification = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { memberName, taskName, status, reason } = req.body;

    if (!memberName || !taskName || !status || !reason) {
      return res.status(400).json({ success: false, message: 'memberName, taskName, status, and reason are required' });
    }

    const { isOwner } = await verifyProjectAccess(projectId, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied: Only the project owner can override verification.' });
    }

    const verificationResult = await overrideVerification(projectId, memberName, taskName, status, reason, req.user);

    return res.status(200).json({
      success: true,
      message: 'Verification overridden successfully',
      verification: verificationResult
    });
  } catch (err) {
    console.error('overrideTaskVerification error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Get verification status for a specific task.
 * GET /api/projects/:projectId/verification/status
 */
exports.getTaskVerificationStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { memberName, taskName } = req.query;

    if (!memberName || !taskName) {
      return res.status(400).json({ success: false, message: 'memberName and taskName query parameters are required' });
    }

    await verifyProjectAccess(projectId, req.user.id);

    let verification = await TaskVerification.findOne({ projectId, memberName, taskName });
    if (!verification) {
      verification = {
        projectId,
        memberName,
        taskName,
        verificationStatus: 'Pending Verification',
        confidence: 0,
        matchedFiles: [],
        matchedCommits: [],
        reasoning: 'Verification has not run for this task yet.',
        timeline: []
      };
    }

    return res.status(200).json({
      success: true,
      verification
    });
  } catch (err) {
    console.error('getTaskVerificationStatus error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Get verification dashboard statistics for a project.
 * GET /api/projects/:projectId/verification/dashboard
 */
exports.getVerificationDashboardStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    await verifyProjectAccess(projectId, req.user.id);

    const realityScoreData = await getProjectRealityScore(projectId);
    const alerts = await generateVerificationAlerts(projectId);

    return res.status(200).json({
      success: true,
      ...realityScoreData,
      alerts
    });
  } catch (err) {
    console.error('getVerificationDashboardStats error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Get all task verification records for a project.
 * GET /api/projects/:projectId/verification/all
 */
exports.getAllVerifications = async (req, res) => {
  try {
    const { projectId } = req.params;
    await verifyProjectAccess(projectId, req.user.id);

    const verifications = await TaskVerification.find({ projectId });

    return res.status(200).json({
      success: true,
      verifications
    });
  } catch (err) {
    console.error('getAllVerifications error:', err);
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
  }
};
