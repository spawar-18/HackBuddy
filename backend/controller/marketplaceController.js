const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const TaskMarketplaceRequest = require('../models/TaskMarketplaceRequest');
const ProjectChat = require('../models/ProjectChat');
const { getMarketplaceRecommendation } = require('../services/aiService');

// Helper to compare Mongo User IDs
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

// Helper to recalculate workload distribution based on task counts
const recalculateWorkloads = (assignments) => {
  const allTasks = assignments.flatMap(a => a.assignedTasks || []);
  const totalCount = allTasks.length;
  if (totalCount === 0) {
    return assignments.map(a => ({ member: a.member, percentage: 0 }));
  }
  return assignments.map(a => {
    const count = (a.assignedTasks || []).length;
    return {
      member: a.member,
      percentage: Math.round((count / totalCount) * 100)
    };
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
    const assignment = project.taskPlan.assignments.find(a => a.member === requestedBy);
    if (!assignment) {
      return res.status(400).json({ success: false, message: `No tasks assigned to you (${requestedBy})` });
    }

    const taskEntry = assignment.assignedTasks.find(t => t.task === taskId);
    if (!taskEntry) {
      return res.status(404).json({ success: false, message: `Task not found in your assignments: ${taskId}` });
    }

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
    project.markModified('taskPlan');
    await project.save();

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
    const myAssignment = project.taskPlan.assignments.find(a => a.member === requestedBy);
    if (!myAssignment) {
      return res.status(400).json({ success: false, message: 'No assignments found for you' });
    }
    const myTaskEntry = myAssignment.assignedTasks.find(t => t.task === taskId);
    if (!myTaskEntry) {
      return res.status(404).json({ success: false, message: 'Task not found in your assignments' });
    }

    // Verify target task
    const targetAssignment = project.taskPlan.assignments.find(a => a.member === targetUser);
    if (!targetAssignment) {
      return res.status(400).json({ success: false, message: `No assignments found for target: ${targetUser}` });
    }
    const targetTaskEntry = targetAssignment.assignedTasks.find(t => t.task === targetTaskId);
    if (!targetTaskEntry) {
      return res.status(404).json({ success: false, message: `Task not found in target's assignments: ${targetTaskId}` });
    }

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
    project.markModified('taskPlan');
    await project.save();

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
      requestType: 'COLLABORATOR',
      requestedBy,
      targetUser,
      reason,
      status: 'Pending',
      aiRecommendation
    });

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

    taskEntry.marketplaceStatus = 'ClaimRequested'; // reuse status for pending claim/collaborator
    project.markModified('taskPlan');
    await project.save();

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
    project.markModified('taskPlan');
    await project.save();

    res.status(201).json({ success: true, message: 'Claim request created successfully', request });
  } catch (error) {
    console.error(error);
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

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get all requests for project
    const requests = await TaskMarketplaceRequest.find({ projectId });

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
      availableTasks,
      assignments: project.taskPlan?.assignments || [],
      workloadDistribution: project.taskPlan?.workloadDistribution || [],
      isOwner: isSameUser(team.createdBy, req.user.id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Approve request (Owner only)
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

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Only team owner can approve
    const isOwner = isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only the team owner can approve marketplace requests' });
    }

    request.status = 'Approved';
    await request.save();

    const { requestType, taskId, requestedBy, targetUser, targetTaskId } = request;

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
        }
      }
    } else if (requestType === 'COLLABORATOR') {
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
        }
      }
    }

    // Recalculate workload distributions
    project.taskPlan.workloadDistribution = recalculateWorkloads(project.taskPlan.assignments);
    project.markModified('taskPlan');
    await project.save();

    // Chat Notification
    try {
      let msg = '';
      if (requestType === 'REASSIGNMENT') {
        msg = `✅ [MARKETPLACE ALERT] Owner approved ${requestedBy}'s request to release task "${taskId}". The task is now available for other team members to claim!`;
      } else if (requestType === 'CLAIM') {
        msg = `✅ [MARKETPLACE ALERT] Owner approved ${requestedBy}'s request to claim task "${taskId}". Ownership has been transferred successfully!`;
      } else if (requestType === 'SWAP') {
        msg = `✅ [MARKETPLACE ALERT] Owner approved task swap between ${requestedBy} (task: "${taskId}") and ${targetUser} (task: "${targetTaskId}"). Task ownerships have been exchanged!`;
      } else if (requestType === 'COLLABORATOR') {
        msg = `✅ [MARKETPLACE ALERT] Owner approved adding ${targetUser} as a collaborator to assist ${requestedBy} on task: "${taskId}"!`;
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

    res.status(200).json({ success: true, message: 'Request approved and assignments updated', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Reject request (Owner only)
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

    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Only owner can reject
    const isOwner = isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    request.status = 'Rejected';
    await request.save();

    // Revert marketplace statuses
    const { requestType, taskId, requestedBy, targetUser, targetTaskId } = request;

    if (requestType === 'REASSIGNMENT' || requestType === 'CLAIM' || requestType === 'COLLABORATOR') {
      project.taskPlan.assignments.forEach(assign => {
        const entry = assign.assignedTasks.find(t => t.task === taskId);
        if (entry) {
          entry.marketplaceStatus = requestType === 'CLAIM' ? 'Available' : 'Locked';
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

    project.markModified('taskPlan');
    await project.save();

    // Chat Notification
    try {
      await ProjectChat.create({
        projectId: request.projectId,
        userId: req.user.id,
        role: 'assistant',
        message: `❌ [MARKETPLACE ALERT] Owner rejected the ${requestType} request for task "${taskId}" by ${requestedBy}.`
      });
    } catch (chatErr) {
      console.error('Failed to save rejection chat notification:', chatErr);
    }

    res.status(200).json({ success: true, message: 'Request rejected', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
