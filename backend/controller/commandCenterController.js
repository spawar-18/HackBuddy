const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const HackathonConfig = require('../models/HackathonConfig');
const Notification = require('../models/Notification');
const TaskMarketplaceRequest = require('../models/TaskMarketplaceRequest');
const { analyzeHackathonCommandCenterWithAI } = require('../services/aiService');
const DecisionEngine = require('../services/ai/DecisionEngine');

// Helper to compare user IDs
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

/**
 * Configure / save hackathon setup (Owner Only)
 * @route   POST /api/projects/:projectId/hackathon/config
 * @access  Private
 */
exports.saveHackathonConfig = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      hackathonName, 
      startTime, 
      endTime, 
      codeFreezeTime, 
      presentationTime, 
      submissionTime, 
      timezone 
    } = req.body;

    if (!hackathonName || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Hackathon name, start time, and end time are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Only owner/leader can edit configuration
    const isOwner = isSameUser(project.createdBy, req.user.id) || isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied: Only the Team Leader/Project Owner can configure the hackathon.' });
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or end date values' });
    }
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'Start time must be before end time' });
    }

    let config = await HackathonConfig.findOne({ projectId });
    let isNew = false;
    
    // Determine status based on current time
    const now = new Date();
    let calculatedStatus = 'Upcoming';
    if (now >= end) {
      calculatedStatus = 'Completed';
    } else if (now >= start) {
      calculatedStatus = 'Running';
    }

    if (!config) {
      isNew = true;
      config = new HackathonConfig({
        projectId,
        hackathonName,
        startTime: start,
        endTime: end,
        codeFreezeTime: codeFreezeTime ? new Date(codeFreezeTime) : null,
        presentationTime: presentationTime ? new Date(presentationTime) : null,
        submissionTime: submissionTime ? new Date(submissionTime) : null,
        timezone: timezone || 'UTC',
        status: calculatedStatus
      });
    } else {
      config.hackathonName = hackathonName;
      config.startTime = start;
      config.endTime = end;
      config.codeFreezeTime = codeFreezeTime ? new Date(codeFreezeTime) : null;
      config.presentationTime = presentationTime ? new Date(presentationTime) : null;
      config.submissionTime = submissionTime ? new Date(submissionTime) : null;
      config.timezone = timezone || 'UTC';
      config.status = calculatedStatus;
    }

    await config.save();

    // Create a notification for config update
    await Notification.create({
      projectId,
      message: `🏆 Hackathon setup saved: "${hackathonName}" starts on ${start.toLocaleString()} and ends on ${end.toLocaleString()}.`,
      type: 'General'
    });

    res.status(200).json({ 
      success: true, 
      message: isNew ? 'Hackathon configuration created successfully' : 'Hackathon configuration updated successfully', 
      config 
    });
  } catch (error) {
    console.error('saveHackathonConfig error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error saving configuration' });
  }
};

/**
 * Get hackathon configuration
 * @route   GET /api/projects/:projectId/hackathon/config
 * @access  Private
 */
exports.getHackathonConfig = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Verify membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    const config = await HackathonConfig.findOne({ projectId });
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.error('getHackathonConfig error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error fetching configuration' });
  }
};

/**
 * Restart consensus voting round (Owner Only)
 * @route   POST /api/projects/:projectId/tech-stack/restart-voting
 * @access  Private
 */
exports.restartConsensusVoting = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Check backend permissions
    const isOwner = isSameUser(project.createdBy, req.user.id) || isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied: Only the Team Leader/Project Owner can restart voting.' });
    }

    // Reset stack finalization on project
    project.finalTechStack = { frontend: '', backend: '', database: '', ai: '', deployment: '', otherTools: '' };
    await project.save();

    // Reset proposal status to Proposed
    const TechStackProposal = require('../models/TechStackProposal');
    const TechStackVote = require('../models/TechStackVote');
    const TechStackAnalysis = require('../models/TechStackAnalysis');

    let proposal = await TechStackProposal.findOne({ projectId });
    if (proposal) {
      proposal.status = 'Proposed';
      await proposal.save();
    }

    // Clear previous votes and analysis
    await TechStackVote.deleteMany({ projectId });
    await TechStackAnalysis.deleteMany({ projectId });

    // Notify entire team
    await sendChatNotification(
      projectId,
      req.user.id,
      `🔄 [VOTING RESTARTED] The Team Leader has restarted consensus voting. Previous votes and AI evaluations have been archived. Please cast your stack votes again.`
    );

    await Notification.create({
      projectId,
      message: `🔄 Tech stack voting has been restarted by the team leader. Please cast your votes again.`,
      type: 'ActionRequired'
    });

    res.status(200).json({ success: true, message: 'Consensus voting restarted successfully' });
  } catch (error) {
    console.error('restartConsensusVoting error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error restarting voting' });
  }
};

/**
 * Get aggregated Hackathon Command Center details
 * @route   GET /api/projects/:projectId/hackathon/dashboard
 * @access  Private
 */
exports.getCommandCenterDashboard = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills avatar');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Verify membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    const data = await DecisionEngine.getDashboardData(projectId);
    if (!data.configured) {
      return res.status(200).json({ success: true, configured: false, message: 'Hackathon is not configured yet.' });
    }

    // Fetch in-app notifications
    const recentNotifications = await Notification.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(10);

    const isOwner = isSameUser(project.createdBy, req.user.id) || isSameUser(team.createdBy, req.user.id);

    res.status(200).json({
      ...data,
      notifications: recentNotifications,
      aiAnalysis: project.commandCenterReport || data.executiveReport,
      isOwner
    });
  } catch (error) {
    console.error('getCommandCenterDashboard error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error loading Command Center' });
  }
};

/**
 * Regenerate AI Command Center Analysis
 * @route   POST /api/projects/:projectId/hackathon/analyze
 * @access  Private
 */
exports.triggerCommandCenterAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Verify membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    const config = await HackathonConfig.findOne({ projectId });
    if (!config) {
      return res.status(400).json({ success: false, message: 'Configure the hackathon parameters before calling AI.' });
    }

    // Compute remaining duration representation
    const now = new Date();
    const diffMs = config.endTime - now;
    const hoursLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    const timeRemaining = `${hoursLeft} hour(s) remaining`;

    // Gather skills
    const teamSkills = {};
    team.members.forEach(member => {
      teamSkills[member.name] = member.skills || [];
    });

    // Gather Marketplace requests
    const marketplaceActivity = await TaskMarketplaceRequest.find({ projectId });

    // Gather Notifications as previous alerts
    const recentNotifs = await Notification.find({ projectId }).limit(5);

    // Call AI Service
    let aiReport;
    try {
      aiReport = await analyzeHackathonCommandCenterWithAI({
        projectDetails: {
          projectName: project.projectName,
          problemStatement: project.problemStatement,
          description: project.description,
          featuresToBuild: project.featuresToBuild
        },
        finalTechStack: project.finalTechStack,
        teamSkills,
        taskPlan: project.taskPlan,
        timeRemaining,
        projectReview: project.projectReview,
        marketplaceActivity,
        previousAlerts: recentNotifs.map(n => n.message)
      });
    } catch (aiErr) {
      console.error('Command Center AI API execution error:', aiErr);
      return res.status(502).json({ success: false, message: 'AI Analysis timeout or failed. Try again.' });
    }

    // Save/cache analysis report directly on the project document
    try {
      project.commandCenterReport = aiReport;
      project.commandCenterReportGeneratedAt = new Date();
      project.markModified('commandCenterReport');
      await project.save();
      // Clear decision engine cache to reload fresh dashboard state
      DecisionEngine.clearCache(projectId);
    } catch (saveErr) {
      console.error('Warning: Could not persist Command Center report to project:', saveErr.message);
    }

    // Create an in-app notification
    await Notification.create({
      projectId,
      message: `🤖 AI Command Center analysis generated. Overall Status: "${aiReport.overallStatus}", Risk Level: "${aiReport.riskLevel}".`,
      type: 'General'
    });

    res.status(200).json({ success: true, aiAnalysis: aiReport });
  } catch (error) {
    console.error('triggerCommandCenterAnalysis error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error running AI Analysis' });
  }
};

/**
 * Get in-app notifications for team
 * @route   GET /api/projects/:projectId/hackathon/notifications
 * @access  Private
 */
exports.getInAppNotifications = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    // Verify membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    const notifications = await Notification.find({ projectId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('getInAppNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
  }
};

/**
 * Mark in-app notifications as read
 * @route   POST /api/projects/:projectId/hackathon/notifications/read
 * @access  Private
 */
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Verify membership
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Notification.updateMany({ projectId, read: false }, { read: true });
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('markNotificationsAsRead error:', error);
    res.status(500).json({ success: false, message: 'Server error updating notifications' });
  }
};
