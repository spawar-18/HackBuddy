const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const HackathonConfig = require('../models/HackathonConfig');
const Notification = require('../models/Notification');
const TaskMarketplaceRequest = require('../models/TaskMarketplaceRequest');
const { analyzeHackathonCommandCenterWithAI } = require('../services/aiService');

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

    // 1. Fetch Hackathon Config
    let config = await HackathonConfig.findOne({ projectId });
    if (!config) {
      return res.status(200).json({ success: true, configured: false, message: 'Hackathon is not configured yet.' });
    }

    // Automatically check and transition status
    const now = new Date();
    let statusChanged = false;
    if (config.status !== 'Completed' && config.status !== 'Cancelled') {
      if (now >= config.endTime) {
        config.status = 'Completed';
        statusChanged = true;
      } else if (now >= config.startTime && config.status === 'Upcoming') {
        config.status = 'Running';
        statusChanged = true;
      }
      if (statusChanged) {
        await config.save();
      }
    }

    // Calculate time remaining in ms
    const diffMs = config.endTime - now;
    const timeRemainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    
    // Time remaining string representation
    let timeRemainingStr = '0 hours left';
    if (timeRemainingSeconds > 0) {
      const hoursLeft = Math.floor(timeRemainingSeconds / 3600);
      const minutesLeft = Math.floor((timeRemainingSeconds % 3600) / 60);
      timeRemainingStr = hoursLeft > 0 ? `${hoursLeft} hours, ${minutesLeft} minutes left` : `${minutesLeft} minutes left`;
    }

    // 2. Task metrics calculations
    let completedTasks = 0;
    let totalTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;
    let blockedTasks = 0;

    let criticalTasksTotal = 0;
    let criticalTasksCompleted = 0;

    const memberProgress = [];
    const teamWorkloads = {};

    // Initializing member workloads
    team.members.forEach(m => {
      teamWorkloads[m.name] = { total: 0, completed: 0, pending: 0, blocked: 0 };
    });

    const timelineEvents = [];

    // Analyze task assignments
    if (project.taskPlan && project.taskPlan.assignments) {
      const assignments = project.taskPlan.assignments;
      const criticalSet = new Set(project.taskPlan.criticalTasks || []);

      assignments.forEach(assign => {
        const mName = assign.member;
        if (!teamWorkloads[mName]) {
          teamWorkloads[mName] = { total: 0, completed: 0, pending: 0, blocked: 0 };
        }

        (assign.assignedTasks || []).forEach(t => {
          totalTasks++;
          teamWorkloads[mName].total++;

          const isCritical = criticalSet.has(t.task);
          if (isCritical) criticalTasksTotal++;

          if (t.status === 'Completed') {
            completedTasks++;
            teamWorkloads[mName].completed++;
            if (isCritical) criticalTasksCompleted++;

            // Create timeline event from completed tasks
            timelineEvents.push({
              time: t.updatedAt || project.taskPlanGeneratedAt || new Date(),
              event: `✅ Task Completed: "${t.task}" by ${mName}`,
              type: 'Success'
            });
          } else if (t.status === 'In Progress') {
            inProgressTasks++;
            teamWorkloads[mName].pending++;
          } else if (t.status === 'Blocked') {
            blockedTasks++;
            teamWorkloads[mName].blocked++;
            teamWorkloads[mName].pending++;
          } else {
            pendingTasks++;
            teamWorkloads[mName].pending++;
          }
        });
      });
    }

    // Populate team progress array
    Object.entries(teamWorkloads).forEach(([mName, metrics]) => {
      memberProgress.push({
        member: mName,
        ...metrics
      });
    });

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Smart time-aware alerts generator
    const alerts = [];
    const hoursRemaining = timeRemainingSeconds / 3600;

    if (config.status === 'Running') {
      if (hoursRemaining <= 1) {
        alerts.push({ message: '🚨 1 Hour Remaining: Code freeze recommended immediately. Clean up presentation and dry-run slides!', priority: 'Critical', timestamp: new Date() });
      } else if (hoursRemaining <= 3) {
        alerts.push({ message: '🚨 3 Hours Remaining: Stop feature development! Focus purely on staging deployments and presentation structure.', priority: 'Critical', timestamp: new Date() });
      } else if (hoursRemaining <= 6) {
        alerts.push({ message: '⚠️ 6 Hours Remaining: Lock your feature scope. Stop adding Nice-to-Have tools, focus on testing.', priority: 'High', timestamp: new Date() });
      } else if (hoursRemaining <= 12) {
        alerts.push({ message: '⚠️ 12 Hours Remaining: Deployment should begin soon to identify host container / database binding issues early.', priority: 'High', timestamp: new Date() });
      } else if (hoursRemaining <= 24) {
        alerts.push({ message: '💡 24 Hours Remaining: Midpoint check-in. Review pending Critical path tasks and reallocate workloads.', priority: 'Medium', timestamp: new Date() });
      }
    }

    // Smart Alerts from task metrics
    if (criticalTasksTotal - criticalTasksCompleted > 0 && hoursRemaining <= 12) {
      alerts.push({ message: `⚠️ There are still ${criticalTasksTotal - criticalTasksCompleted} critical path tasks pending with 12h or less remaining!`, priority: 'High', timestamp: new Date() });
    }

    // Blocked tasks alerts
    if (blockedTasks > 0) {
      alerts.push({ message: `🚫 Stalled progress: ${blockedTasks} tasks are currently marked as "Blocked". Resolve immediately!`, priority: 'High', timestamp: new Date() });
    }

    // Check workload balance
    let overloadedMember = null;
    let minLoad = 999;
    let maxLoad = 0;
    memberProgress.forEach(mp => {
      const load = mp.pending;
      if (load > maxLoad) {
        maxLoad = load;
        overloadedMember = mp.member;
      }
      if (load < minLoad) minLoad = load;
    });

    let teamHealth = 'Balanced';
    if (maxLoad - minLoad > 5) {
      teamHealth = 'High Risk';
      alerts.push({ message: `⚠️ Workload Imbalance: ${overloadedMember} is carrying an overloaded task load (${maxLoad} pending) compared to others.`, priority: 'High', timestamp: new Date() });
    } else if (maxLoad - minLoad > 3) {
      teamHealth = 'Moderately Balanced';
    }

    // Fetch marketplace requests
    const marketplaceActivity = await TaskMarketplaceRequest.find({ projectId });

    // Fetch in-app notifications
    const recentNotifications = await Notification.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Build timeline events
    timelineEvents.push({
      time: config.startTime,
      event: `🚀 Hackathon Started: "${config.hackathonName}" is live!`,
      type: 'Info'
    });
    
    if (config.codeFreezeTime) {
      timelineEvents.push({
        time: config.codeFreezeTime,
        event: `❄️ Code Freeze Deadline`,
        type: 'Milestone'
      });
    }
    if (config.submissionTime) {
      timelineEvents.push({
        time: config.submissionTime,
        event: `📤 Final Submission Deadline`,
        type: 'Milestone'
      });
    }

    // Sort timeline events chronologically
    const sortedTimeline = timelineEvents
      .map(e => ({ ...e, time: new Date(e.time) }))
      .sort((a, b) => b.time - a.time); // Latest first for dashboard timeline display

    // Check if there is an existing AI Command Center report (stored on the project)
    const existingAiReport = project.commandCenterReport || null;

    res.status(200).json({
      success: true,
      configured: true,
      config,
      timeRemainingSeconds,
      timeRemainingStr,
      progress: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        blockedTasks,
        completionPercentage,
        criticalTasksTotal,
        criticalTasksCompleted
      },
      teamHealth,
      memberProgress,
      alerts,
      marketplaceActivity: marketplaceActivity.map(req => ({
        _id: req._id,
        member: req.userId?.name || 'Unknown',
        task: req.taskName,
        requestType: req.requestType,
        status: req.status,
        createdAt: req.createdAt
      })),
      notifications: recentNotifications,
      timeline: sortedTimeline,
      aiAnalysis: existingAiReport,
      isOwner: isSameUser(project.createdBy, req.user.id) || isSameUser(team.createdBy, req.user.id)
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

    // Save/cache analysis report directly on the project document (avoids TechStackAnalysis schema conflicts)
    try {
      project.commandCenterReport = aiReport;
      project.commandCenterReportGeneratedAt = new Date();
      project.markModified('commandCenterReport');
      await project.save();
    } catch (saveErr) {
      console.error('Warning: Could not persist Command Center report to project:', saveErr.message);
      // Non-fatal: still return the report to the user
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
