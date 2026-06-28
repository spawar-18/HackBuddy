const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const TaskMarketplaceRequest = require('../models/TaskMarketplaceRequest');
const ProjectChat = require('../models/ProjectChat');
const Notification = require('../models/Notification');
const { getMarketplaceRecommendation } = require('../services/aiService');
const { recalculateTaskPlanMetrics } = require('../services/taskExecutionService');

// Helper to compare Mongo User IDs
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

const findMemberByName = (team, name) => {
  if (!name) return null;
  return (team.members || []).find(member => member.name && member.name.toLowerCase() === String(name).toLowerCase());
};

const findTaskInPlan = (taskPlan, taskId, ownerName = null) => {
  let found = null;
  (taskPlan?.assignments || []).forEach(assignment => {
    if (found) return;
    if (ownerName && assignment.member !== ownerName) return;
    const index = (assignment.assignedTasks || []).findIndex(task => task.id === taskId || task.task === taskId || task.taskName === taskId);
    if (index !== -1) {
      found = { assignment, task: assignment.assignedTasks[index], index };
    }
  });
  return found;
};

const appendTaskAudit = (task, action, actor, details = {}) => {
  task.auditTrail = task.auditTrail || [];
  task.auditTrail.push({
    action,
    actor,
    at: new Date().toISOString(),
    ...details
  });
};

const appendMarketplaceActivity = (project, activity) => {
  project.taskPlan.marketplace = project.taskPlan.marketplace || {};
  project.taskPlan.marketplace.activityLog = project.taskPlan.marketplace.activityLog || [];
  project.taskPlan.marketplace.history = project.taskPlan.marketplace.history || [];
  const entry = { at: new Date().toISOString(), ...activity };
  project.taskPlan.marketplace.activityLog.push(entry);
  project.taskPlan.marketplace.history.push(entry);
};

const DecisionEngine = require('../services/ai/DecisionEngine');

const invalidateCommandCenter = (project) => {
  project.commandCenterReport = null;
  project.commandCenterReportGeneratedAt = null;
  if (project._id) {
    DecisionEngine.clearCache(project._id.toString());
  }
};

const createTargetedNotification = async ({ projectId, team, targetUser, message, actorId }) => {
  const targetMember = findMemberByName(team, targetUser);
  await Notification.create({
    projectId,
    userId: targetMember?._id || null,
    message,
    type: 'Marketplace'
  });

  if (!targetMember && actorId) {
    await Notification.create({
      projectId,
      userId: actorId,
      message: `Marketplace notification could not find selected member "${targetUser}".`,
      type: 'Marketplace'
    });
  }
};

const createRequesterNotification = async ({ projectId, team, requesterName, message }) => {
  const requester = findMemberByName(team, requesterName);
  await Notification.create({
    projectId,
    userId: requester?._id || null,
    message,
    type: 'Marketplace'
  });
};

// @desc    Request task reassignment
// @route   POST /api/tasks/request-reassignment
// @access  Private
exports.requestReassignment = async (req, res) => {
  try {
    const { projectId, taskId, reason } = req.body;

    if (!projectId || !taskId || !reason) {
      return res.status(400).json({ success: false, message: 'projectId, taskId, and reason are required' });
    }

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const requestingUser = await User.findById(req.user.id);
    const requestedBy = requestingUser.name;

    // Verify task ownership
    const found = findTaskInPlan(project.taskPlan, taskId, requestedBy);
    if (!found) {
      return res.status(400).json({ success: false, message: `No tasks assigned to you (${requestedBy})` });
    }

    const taskEntry = found.task;

    if (taskEntry.marketplaceStatus && taskEntry.marketplaceStatus !== 'Locked') {
      return res.status(400).json({ success: false, message: 'Task is already in a marketplace workflow' });
    }

    // Call AI Recommendation
    const teamSkills = {};
    team.members.forEach(m => { teamSkills[m.name] = m.skills || []; });
    const currentWorkload = {};
    project.taskPlan.workloadDistribution?.forEach(w => { currentWorkload[w.member] = w.percentage; });

    let aiRecommendation = { recommendation: 'Approve', confidenceScore: 80, reason: 'Looks reasonable.' };
    try {
      aiRecommendation = await getMarketplaceRecommendation({
        task: taskId,
        requestType: 'REASSIGNMENT',
        requestedBy,
        reason,
        teamSkills,
        currentWorkload
      });
    } catch (err) {
      console.error('AI recommendation failed, falling back to defaults:', err);
    }

    // Create marketplace request
    const request = await TaskMarketplaceRequest.create({
      projectId,
      taskId,
      requestType: 'REASSIGNMENT',
      requestedBy,
      reason,
      status: 'Pending',
      aiRecommendation
    });
    request.activityLog.push({
      action: 'Created',
      actor: requestedBy,
      at: new Date().toISOString(),
      details: 'Requested task release to marketplace'
    });
    await request.save();

    // Chat Notification
    try {
      await ProjectChat.create({
        projectId,
        userId: req.user.id,
        role: 'assistant',
        message: `📢 [MARKETPLACE ALERT] ${requestedBy} has requested reassignment for task: "${taskId}". Reason: "${reason}". Waiting for owner approval.`
      });
    } catch (chatErr) {
      console.error('Failed to save project chat notification:', chatErr);
    }

    // Update task plan
    taskEntry.marketplaceStatus = 'ReassignmentRequested';
    appendTaskAudit(taskEntry, 'ReassignmentRequested', requestedBy, { reason });
    appendMarketplaceActivity(project, {
      action: 'ReassignmentRequested',
      taskId,
      requestedBy,
      reason
    });
    invalidateCommandCenter(project);
    project.markModified('taskPlan');
    project.markModified('commandCenterReport');
    await project.save();

    await createTargetedNotification({
      projectId,
      team,
      targetUser: team.members.find(member => isSameUser(member._id, team.createdBy))?.name,
      actorId: req.user.id,
      message: `${requestedBy} requested release of "${taskId}". Review the marketplace workflow.`
    });

    res.status(201).json({ success: true, message: 'Reassignment request created', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Request task swap
// @route   POST /api/tasks/request-swap
// @access  Private
exports.requestSwap = async (req, res) => {
  try {
    const { projectId, taskId, targetUser, targetTaskId, reason } = req.body;

    if (!projectId || !taskId || !targetUser || !targetTaskId || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const requestingUser = await User.findById(req.user.id);
    const requestedBy = requestingUser.name;

    // Verify own task
    const myFound = findTaskInPlan(project.taskPlan, taskId, requestedBy);
    if (!myFound) {
      return res.status(404).json({ success: false, message: 'Task not found in your assignments' });
    }
    const myTaskEntry = myFound.task;

    // Verify target task
    const targetAssignment = project.taskPlan.assignments.find(a => a.member === targetUser);
    if (!targetAssignment) {
      return res.status(400).json({ success: false, message: `No assignments found for target: ${targetUser}` });
    }
    const targetFound = findTaskInPlan(project.taskPlan, targetTaskId, targetUser);
    if (!targetFound) {
      return res.status(404).json({ success: false, message: `Task not found in target's assignments: ${targetTaskId}` });
    }
    const targetTaskEntry = targetFound.task;

    if (myTaskEntry.marketplaceStatus !== 'Locked' || targetTaskEntry.marketplaceStatus !== 'Locked') {
      return res.status(400).json({ success: false, message: 'One or both tasks are already pending request' });
    }

    // AI Recommendation
    const teamSkills = {};
    team.members.forEach(m => { teamSkills[m.name] = m.skills || []; });
    const currentWorkload = {};
    project.taskPlan.workloadDistribution?.forEach(w => { currentWorkload[w.member] = w.percentage; });

    let aiRecommendation = { recommendation: 'Approve', confidenceScore: 85, reason: 'Looks reasonable.' };
    try {
      aiRecommendation = await getMarketplaceRecommendation({
        task: taskId,
        requestType: 'SWAP',
        requestedBy,
        targetUser,
        reason: `${reason} (Swap with: ${targetTaskId})`,
        teamSkills,
        currentWorkload
      });
    } catch (err) {
      console.error('AI swap recommendation failed:', err);
    }

    const request = await TaskMarketplaceRequest.create({
      projectId,
      taskId,
      requestType: 'SWAP',
      requestedBy,
      targetUser,
      targetTaskId,
      reason,
      status: 'Pending',
      aiRecommendation
    });
    request.activityLog.push({
      action: 'Created',
      actor: requestedBy,
      at: new Date().toISOString(),
      details: `Requested swap with ${targetUser}`
    });
    await request.save();

    // Chat Notification
    try {
      await ProjectChat.create({
        projectId,
        userId: req.user.id,
        role: 'assistant',
        message: `🔄 [MARKETPLACE ALERT] ${requestedBy} has requested to swap task "${taskId}" with ${targetUser}'s task "${targetTaskId}". Reason: "${reason}". Waiting for owner approval.`
      });
    } catch (chatErr) {
      console.error('Failed to save project chat notification:', chatErr);
    }

    myTaskEntry.marketplaceStatus = 'SwapRequested';
    targetTaskEntry.marketplaceStatus = 'SwapRequested';
    appendTaskAudit(myTaskEntry, 'SwapRequested', requestedBy, { targetUser, targetTaskId, reason });
    appendTaskAudit(targetTaskEntry, 'SwapRequested', requestedBy, { targetUser, sourceTaskId: taskId, reason });
    appendMarketplaceActivity(project, {
      action: 'SwapRequested',
      taskId,
      targetTaskId,
      requestedBy,
      targetUser
    });
    invalidateCommandCenter(project);
    project.markModified('taskPlan');
    project.markModified('commandCenterReport');
    await project.save();

    await createTargetedNotification({
      projectId,
      team,
      targetUser,
      actorId: req.user.id,
      message: `${requestedBy} requested a task swap: "${taskId}" for "${targetTaskId}".`
    });

    res.status(201).json({ success: true, message: 'Swap request created', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Request collaborator
// @route   POST /api/tasks/request-collaborator
// @access  Private
exports.requestCollaborator = async (req, res) => {
  try {
    const { projectId, taskId, targetUser, reason } = req.body;

    if (!projectId || !taskId || !targetUser || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const requestingUser = await User.findById(req.user.id);
    const requestedBy = requestingUser.name;

    // Verify ownership
    const assignment = project.taskPlan.assignments.find(a => a.member === requestedBy);
    if (!assignment) {
      return res.status(400).json({ success: false, message: 'No assignments found for you' });
    }
    const taskEntry = assignment.assignedTasks.find(t => t.task === taskId);
    if (!taskEntry) {
      return res.status(404).json({ success: false, message: 'Task not found in your assignments' });
    }

    // AI Recommendation
    const teamSkills = {};
    team.members.forEach(m => { teamSkills[m.name] = m.skills || []; });
    const currentWorkload = {};
    project.taskPlan.workloadDistribution?.forEach(w => { currentWorkload[w.member] = w.percentage; });

    let aiRecommendation = { recommendation: 'Approve', confidenceScore: 85, reason: 'Looks reasonable.' };
    try {
      aiRecommendation = await getMarketplaceRecommendation({
        task: taskId,
        requestType: 'COLLABORATOR',
        requestedBy,
        targetUser,
        reason,
        teamSkills,
        currentWorkload
      });
    } catch (err) {
      console.error(err);
    }

    const request = await TaskMarketplaceRequest.create({
      projectId,
      taskId,
      requestType: 'COLLABORATION',
      requestedBy,
      targetUser,
      reason,
      status: 'Pending',
      aiRecommendation
    });
    request.activityLog.push({
      action: 'Created',
      actor: requestedBy,
      at: new Date().toISOString(),
      details: `Requested collaboration from ${targetUser}`
    });
    await request.save();

    // Chat Notification
    try {
      await ProjectChat.create({
        projectId,
        userId: req.user.id,
        role: 'assistant',
        message: `🤝 [MARKETPLACE ALERT] ${requestedBy} has requested ${targetUser} as a collaborator for task "${taskId}". Reason: "${reason}". Waiting for owner approval.`
      });
    } catch (chatErr) {
      console.error('Failed to save project chat notification:', chatErr);
    }

    taskEntry.marketplaceStatus = 'CollaborationRequested';
    appendTaskAudit(taskEntry, 'CollaborationRequested', requestedBy, { targetUser, reason });
    appendMarketplaceActivity(project, {
      action: 'CollaborationRequested',
      taskId,
      requestedBy,
      targetUser,
      reason
    });
    invalidateCommandCenter(project);
    project.markModified('taskPlan');
    project.markModified('commandCenterReport');
    await project.save();

    await createTargetedNotification({
      projectId,
      team,
      targetUser,
      actorId: req.user.id,
      message: `${requestedBy} requested collaboration on "${taskId}".`
    });

    res.status(201).json({ success: true, message: 'Collaborator request created', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Claim an available task
// @route   POST /api/tasks/claim-task
// @access  Private
exports.claimTask = async (req, res) => {
  try {
    const { projectId, taskId, reason } = req.body;

    if (!projectId || !taskId || !reason) {
      return res.status(400).json({ success: false, message: 'projectId, taskId, and reason are required' });
    }

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const requestingUser = await User.findById(req.user.id);
    const requestedBy = requestingUser.name;

    // Find if task is marked Available in ANY member's assignments
    let foundTask = null;
    project.taskPlan.assignments.forEach(assign => {
      const entry = assign.assignedTasks.find(t => t.task === taskId && t.marketplaceStatus === 'Available');
      if (entry) {
        foundTask = entry;
      }
    });

    if (!foundTask) {
      return res.status(404).json({ success: false, message: 'Task is not available for claiming in the marketplace' });
    }

    // AI Recommendation
    const teamSkills = {};
    team.members.forEach(m => { teamSkills[m.name] = m.skills || []; });
    const currentWorkload = {};
    project.taskPlan.workloadDistribution?.forEach(w => { currentWorkload[w.member] = w.percentage; });

    let aiRecommendation = { recommendation: 'Approve', confidenceScore: 85, reason: 'Looks reasonable.' };
    try {
      aiRecommendation = await getMarketplaceRecommendation({
        task: taskId,
        requestType: 'CLAIM',
        requestedBy,
        reason,
        teamSkills,
        currentWorkload
      });
    } catch (err) {
      console.error(err);
    }

    const request = await TaskMarketplaceRequest.create({
      projectId,
      taskId,
      requestType: 'CLAIM',
      requestedBy,
      reason,
      status: 'Pending',
      aiRecommendation
    });
    request.activityLog.push({
      action: 'Created',
      actor: requestedBy,
      at: new Date().toISOString(),
      details: 'Requested ownership of available task'
    });
    await request.save();

    // Chat Notification
    try {
      await ProjectChat.create({
        projectId,
        userId: req.user.id,
        role: 'assistant',
        message: `🙋‍♂️ [MARKETPLACE ALERT] ${requestedBy} has claimed available task: "${taskId}". Reason: "${reason}". Waiting for owner approval.`
      });
    } catch (chatErr) {
      console.error('Failed to save project chat notification:', chatErr);
    }

    foundTask.marketplaceStatus = 'ClaimRequested';
    appendTaskAudit(foundTask, 'ClaimRequested', requestedBy, { reason });
    appendMarketplaceActivity(project, {
      action: 'ClaimRequested',
      taskId,
      requestedBy,
      reason
    });
    invalidateCommandCenter(project);
    project.markModified('taskPlan');
    project.markModified('commandCenterReport');
    await project.save();

    await createTargetedNotification({
      projectId,
      team,
      targetUser: team.members.find(member => isSameUser(member._id, team.createdBy))?.name,
      actorId: req.user.id,
      message: `${requestedBy} requested to claim "${taskId}".`
    });

    res.status(201).json({ success: true, message: 'Claim request created successfully', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Request implementation help from a selected teammate
// @route   POST /api/tasks/request-help
// @access  Private
exports.requestHelp = async (req, res) => {
  try {
    const { projectId, taskId, targetUser, reason, currentBlockers = [], estimatedEffort = 0 } = req.body;

    if (!projectId || !taskId || !targetUser || !reason) {
      return res.status(400).json({ success: false, message: 'projectId, taskId, targetUser, and reason are required' });
    }

    const project = await Project.findOne({ _id: projectId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const requestingUser = await User.findById(req.user.id);
    const requestedBy = requestingUser.name;
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const taskFound = findTaskInPlan(project.taskPlan, taskId, requestedBy);
    if (!taskFound) {
      return res.status(404).json({ success: false, message: 'Task not found in your assignments' });
    }

    const targetMember = findMemberByName(team, targetUser);
    if (!targetMember) {
      return res.status(404).json({ success: false, message: `Target member (${targetUser}) not found` });
    }

    const taskEntry = taskFound.task;
    const teamSkills = {};
    team.members.forEach(m => { teamSkills[m.name] = m.skills || []; });
    const currentWorkload = {};
    project.taskPlan.workloadDistribution?.forEach(w => { currentWorkload[w.member] = w.percentage; });

    let aiRecommendation = { recommendation: 'Approve', confidenceScore: 82, reason: 'Help request is reasonable for unblocking delivery.' };
    try {
      aiRecommendation = await getMarketplaceRecommendation({
        task: taskId,
        requestType: 'HELP',
        requestedBy,
        targetUser,
        reason,
        currentBlockers,
        estimatedEffort,
        teamSkills,
        currentWorkload
      });
    } catch (err) {
      console.error('AI help recommendation failed:', err.message);
    }

    const request = await TaskMarketplaceRequest.create({
      projectId,
      taskId,
      requestType: 'HELP',
      requestedBy,
      targetUser,
      reason,
      currentBlockers,
      estimatedEffort: Number(estimatedEffort || taskEntry.estimatedHours || 0),
      status: 'Pending',
      aiRecommendation,
      activityLog: [{
        action: 'Created',
        actor: requestedBy,
        at: new Date().toISOString(),
        details: `Requested help from ${targetUser}`
      }]
    });

    taskEntry.marketplaceStatus = 'HelpRequested';
    appendTaskAudit(taskEntry, 'HelpRequested', requestedBy, { targetUser, reason, currentBlockers });
    appendMarketplaceActivity(project, {
      action: 'HelpRequested',
      taskId,
      requestedBy,
      targetUser,
      reason
    });
    invalidateCommandCenter(project);
    project.markModified('taskPlan');
    project.markModified('commandCenterReport');
    await project.save();

    await createTargetedNotification({
      projectId,
      team,
      targetUser,
      actorId: req.user.id,
      message: `${requestedBy} requested help on "${taskId}". Blockers: ${(currentBlockers || []).join(', ') || reason}`
    });

    await createTargetedNotification({
      projectId,
      team,
      targetUser: team.members.find(member => isSameUser(member._id, team.createdBy))?.name,
      actorId: req.user.id,
      message: `${requestedBy} opened a help request for "${taskId}" with ${targetUser}.`
    });

    return res.status(201).json({ success: true, message: 'Help request created', request });
  } catch (error) {
    console.error('requestHelp error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all marketplace requests and available tasks
// @route   GET /api/projects/:projectId/marketplace
// @access  Private
exports.getMarketplace = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get all requests for project
    const requests = await TaskMarketplaceRequest.find({ projectId });
    const currentUser = await User.findById(req.user.id);
    const currentUserName = currentUser?.name || '';

    // Collect available tasks
    const availableTasks = [];
    project.taskPlan?.assignments?.forEach(assign => {
      assign.assignedTasks?.forEach(t => {
        if (t.marketplaceStatus === 'Available' || t.marketplaceStatus === 'ClaimRequested') {
          availableTasks.push({
            task: t.task,
            status: t.status,
            assignedTo: assign.member,
            marketplaceStatus: t.marketplaceStatus
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      requests,
      incomingRequests: requests.filter(req =>
        req.status === 'Pending' &&
        req.targetUser &&
        currentUserName &&
        req.targetUser.toLowerCase() === currentUserName.toLowerCase()
      ),
      outgoingRequests: requests.filter(req =>
        currentUserName &&
        req.requestedBy &&
        req.requestedBy.toLowerCase() === currentUserName.toLowerCase()
      ),
      history: requests.filter(req => req.status !== 'Pending'),
      availableTasks,
      assignments: project.taskPlan?.assignments || [],
      workloadDistribution: project.taskPlan?.workloadDistribution || [],
      dependencyGraph: project.taskPlan?.dependencyGraph || { nodes: [], edges: [] },
      epics: project.taskPlan?.epics || [],
      marketplace: project.taskPlan?.marketplace || {},
      filters: {
        features: project.featuresToBuild || [],
        priorities: ['High', 'Medium', 'Low'],
        statuses: ['Not Started', 'In Progress', 'Blocked', 'Completed'],
        skills: Array.from(new Set((team.members || []).flatMap(member => member.skills || []))),
        owners: (team.members || []).map(member => member.name)
      },
      isOwner: isSameUser(team.createdBy, req.user.id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Approve request
// @route   PATCH /api/marketplace/:requestId/approve
// @access  Private
exports.approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await TaskMarketplaceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const project = await Project.findOne({ _id: request.projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const { requestType, targetUser } = request;
    const targetDecisionTypes = ['SWAP', 'COLLABORATOR', 'COLLABORATION', 'HELP'];

    if (targetDecisionTypes.includes(requestType)) {
      const targetMember = team.members.find(member => member.name && member.name.toLowerCase() === targetUser.toLowerCase());
      if (!targetMember) {
        return res.status(404).json({ success: false, message: `Target member (${targetUser}) not found in the team` });
      }
      const isTargetUser = isSameUser(targetMember._id, req.user.id);
      if (!isTargetUser) {
        return res.status(403).json({ success: false, message: `Unauthorized: Only ${targetUser} can approve this request` });
      }
    } else {
      const isOwner = isSameUser(team.createdBy, req.user.id);
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Only the team owner can approve this marketplace request' });
      }
    }

    request.status = 'Approved';
    request.decisionBy = req.user.id;
    request.approvedAt = new Date();
    request.activityLog = request.activityLog || [];
    request.activityLog.push({
      action: 'Approved',
      actor: team.members.find(member => isSameUser(member._id, req.user.id))?.name || 'Unknown',
      at: new Date().toISOString()
    });
    await request.save();

    const { taskId, requestedBy, targetTaskId } = request;

    if (requestType === 'REASSIGNMENT') {
      // Find the task inside requestedBy assignments and set to Available
      const assignment = project.taskPlan.assignments.find(a => a.member === requestedBy);
      if (assignment) {
        const taskEntry = assignment.assignedTasks.find(t => t.task === taskId);
        if (taskEntry) {
          taskEntry.marketplaceStatus = 'Available';
          taskEntry.assignedTo = '';
        }
      }
    } else if (requestType === 'CLAIM') {
      // Transfer task ownership
      let taskToMove = null;
      let originalOwnerAssign = null;

      project.taskPlan.assignments.forEach(assign => {
        const index = assign.assignedTasks.findIndex(t => t.task === taskId);
        if (index !== -1) {
          taskToMove = assign.assignedTasks[index];
          originalOwnerAssign = assign;
          assign.assignedTasks.splice(index, 1);
        }
      });

      if (taskToMove) {
        taskToMove.marketplaceStatus = 'Locked';
        taskToMove.assignedTo = requestedBy;
        
        let claimerAssign = project.taskPlan.assignments.find(a => a.member === requestedBy);
        if (!claimerAssign) {
          claimerAssign = { member: requestedBy, skills: [], assignedTasks: [] };
          project.taskPlan.assignments.push(claimerAssign);
        }
        claimerAssign.assignedTasks.push(taskToMove);
      }
    } else if (requestType === 'SWAP') {
      // Swap taskId (requestedBy) with targetTaskId (targetUser)
      const reqAssign = project.taskPlan.assignments.find(a => a.member === requestedBy);
      const tarAssign = project.taskPlan.assignments.find(a => a.member === targetUser);

      if (reqAssign && tarAssign) {
        const reqTaskIdx = reqAssign.assignedTasks.findIndex(t => t.task === taskId);
        const tarTaskIdx = tarAssign.assignedTasks.findIndex(t => t.task === targetTaskId);

        if (reqTaskIdx !== -1 && tarTaskIdx !== -1) {
          const reqTask = reqAssign.assignedTasks[reqTaskIdx];
          const tarTask = tarAssign.assignedTasks[tarTaskIdx];

          reqTask.marketplaceStatus = 'Locked';
          tarTask.marketplaceStatus = 'Locked';

          // Update assignedTo fields to match new owners
          reqTask.assignedTo = targetUser;
          tarTask.assignedTo = requestedBy;

          // Swap references
          reqAssign.assignedTasks[reqTaskIdx] = tarTask;
          tarAssign.assignedTasks[tarTaskIdx] = reqTask;
          appendTaskAudit(reqTask, 'OwnershipTransferred', targetUser, { from: requestedBy, to: targetUser });
          appendTaskAudit(tarTask, 'OwnershipTransferred', requestedBy, { from: targetUser, to: requestedBy });
        }
      }
    } else if (requestType === 'COLLABORATOR' || requestType === 'COLLABORATION' || requestType === 'HELP') {
      // Add collaborator to requestedBy's task
      const assignment = project.taskPlan.assignments.find(a => a.member === requestedBy);
      if (assignment) {
        const taskEntry = assignment.assignedTasks.find(t => t.task === taskId);
        if (taskEntry) {
          taskEntry.marketplaceStatus = 'Locked';
          if (!taskEntry.collaborators) {
            taskEntry.collaborators = [];
          }
          if (!taskEntry.collaborators.includes(targetUser)) {
            taskEntry.collaborators.push(targetUser);
          }
          taskEntry.sharedProgress = taskEntry.sharedProgress || [];
          taskEntry.sharedProgress.push({
            primaryOwner: requestedBy,
            collaborator: targetUser,
            contributionPercent: requestType === 'HELP' ? 20 : 40,
            status: 'Active',
            startedAt: new Date().toISOString()
          });
          appendTaskAudit(taskEntry, requestType === 'HELP' ? 'HelpAccepted' : 'CollaborationStarted', targetUser, {
            requestedBy,
            estimatedEffort: request.estimatedEffort || taskEntry.estimatedHours || 0
          });
        }
      }
    }

    // Recalculate workload distributions
    project.taskPlan = recalculateTaskPlanMetrics(project.taskPlan);
    appendMarketplaceActivity(project, {
      action: 'RequestApproved',
      requestId: request._id,
      requestType,
      taskId,
      requestedBy,
      targetUser
    });
    invalidateCommandCenter(project);
    project.markModified('taskPlan');
    project.markModified('commandCenterReport');
    await project.save();
    request.impact = {
      ...(request.impact || {}),
      workloadDelta: project.taskPlan.workloadDistribution || [],
      commandCenterInvalidated: true
    };
    await request.save();

    // Chat Notification
    try {
      let msg = '';
      if (requestType === 'REASSIGNMENT') {
        msg = `✅ [MARKETPLACE ALERT] Owner approved ${requestedBy}'s request to release task "${taskId}". The task is now available for other team members to claim!`;
      } else if (requestType === 'CLAIM') {
        msg = `✅ [MARKETPLACE ALERT] Owner approved ${requestedBy}'s request to claim task "${taskId}". Ownership has been transferred successfully!`;
      } else if (requestType === 'SWAP') {
        msg = `✅ [MARKETPLACE ALERT] ${targetUser} approved task swap with ${requestedBy} (task: "${taskId}" ↔️ "${targetTaskId}"). Task ownerships have been exchanged!`;
      } else if (requestType === 'COLLABORATOR') {
        msg = `✅ [MARKETPLACE ALERT] ${targetUser} approved request to collaborate with ${requestedBy} on task: "${taskId}"!`;
      }
      if (msg) {
        await ProjectChat.create({
          projectId: request.projectId,
          userId: req.user.id,
          role: 'assistant',
          message: msg
        });
      }
    } catch (chatErr) {
      console.error('Failed to save approval chat notification:', chatErr);
    }

    await createRequesterNotification({
      projectId: request.projectId,
      team,
      requesterName: requestedBy,
      message: `${requestType} request for "${taskId}" was approved.`
    });

    res.status(200).json({ success: true, message: 'Request approved and assignments updated', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Reject request
// @route   PATCH /api/marketplace/:requestId/reject
// @access  Private
exports.rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await TaskMarketplaceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const project = await Project.findOne({ _id: request.projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const { requestType, targetUser } = request;
    const targetDecisionTypes = ['SWAP', 'COLLABORATOR', 'COLLABORATION', 'HELP'];

    if (targetDecisionTypes.includes(requestType)) {
      const targetMember = team.members.find(member => member.name && member.name.toLowerCase() === targetUser.toLowerCase());
      if (!targetMember) {
        return res.status(404).json({ success: false, message: `Target member (${targetUser}) not found in the team` });
      }
      const isTargetUser = isSameUser(targetMember._id, req.user.id);
      if (!isTargetUser) {
        return res.status(403).json({ success: false, message: `Unauthorized: Only ${targetUser} can reject this request` });
      }
    } else {
      const isOwner = isSameUser(team.createdBy, req.user.id);
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Only the team owner can reject this marketplace request' });
      }
    }

    request.status = 'Rejected';
    request.decisionBy = req.user.id;
    request.rejectedAt = new Date();
    request.activityLog = request.activityLog || [];
    request.activityLog.push({
      action: 'Rejected',
      actor: team.members.find(member => isSameUser(member._id, req.user.id))?.name || 'Unknown',
      at: new Date().toISOString()
    });
    await request.save();

    // Revert marketplace statuses
    const { taskId, requestedBy, targetTaskId } = request;

    if (requestType === 'REASSIGNMENT' || requestType === 'CLAIM' || requestType === 'COLLABORATOR' || requestType === 'COLLABORATION' || requestType === 'HELP') {
      project.taskPlan.assignments.forEach(assign => {
        const entry = assign.assignedTasks.find(t => t.task === taskId);
        if (entry) {
          entry.marketplaceStatus = requestType === 'CLAIM' ? 'Available' : 'Locked';
          appendTaskAudit(entry, 'MarketplaceRequestRejected', targetUser || 'Owner', { requestType, requestedBy });
        }
      });
    } else if (requestType === 'SWAP') {
      const reqAssign = project.taskPlan.assignments.find(a => a.member === requestedBy);
      const tarAssign = project.taskPlan.assignments.find(a => a.member === targetUser);

      if (reqAssign) {
        const entry = reqAssign.assignedTasks.find(t => t.task === taskId);
        if (entry) entry.marketplaceStatus = 'Locked';
      }
      if (tarAssign) {
        const entry = tarAssign.assignedTasks.find(t => t.task === targetTaskId);
        if (entry) entry.marketplaceStatus = 'Locked';
      }
    }

    project.taskPlan = recalculateTaskPlanMetrics(project.taskPlan);
    appendMarketplaceActivity(project, {
      action: 'RequestRejected',
      requestId: request._id,
      requestType,
      taskId,
      requestedBy,
      targetUser
    });
    invalidateCommandCenter(project);
    project.markModified('taskPlan');
    project.markModified('commandCenterReport');
    await project.save();

    // Chat Notification
    try {
      let msg = '';
      if (requestType === 'SWAP' || requestType === 'COLLABORATOR') {
        msg = `❌ [MARKETPLACE ALERT] ${targetUser} rejected the ${requestType} request for task "${taskId}" by ${requestedBy}.`;
      } else {
        msg = `❌ [MARKETPLACE ALERT] Owner rejected the ${requestType} request for task "${taskId}" by ${requestedBy}.`;
      }
      await ProjectChat.create({
        projectId: request.projectId,
        userId: req.user.id,
        role: 'assistant',
        message: msg
      });
    } catch (chatErr) {
      console.error('Failed to save rejection chat notification:', chatErr);
    }

    await createRequesterNotification({
      projectId: request.projectId,
      team,
      requesterName: requestedBy,
      message: `${requestType} request for "${taskId}" was rejected.`
    });

    res.status(200).json({ success: true, message: 'Request rejected', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
