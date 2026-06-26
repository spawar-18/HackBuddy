const Project = require('../models/Project');
const Team = require('../models/Team');
const { generateTaskPlanWithAI } = require('../services/aiService');

// Helper to compare user IDs
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

/**
 * Build project context string for AI
 */
const buildContextString = (project, team) => {
  let ctx = `Project Name: ${project.projectName}
Track: ${project.track || 'Not specified'}
Duration: ${project.duration || 'Not specified'}
Problem Statement: ${project.problemStatement}
Description: ${project.description || 'Not specified'}
Features To Build:
${(project.featuresToBuild || []).map(f => `- ${f}`).join('\n') || '- None specified'}

`;

  if (project.finalTechStack && project.finalTechStack.frontend) {
    ctx += `Final Tech Stack:
- Frontend: ${project.finalTechStack.frontend}
- Backend: ${project.finalTechStack.backend}
- Database: ${project.finalTechStack.database}
- AI/ML: ${project.finalTechStack.ai}
- Deployment: ${project.finalTechStack.deployment}

`;
  }

  if (project.projectReview) {
    ctx += `AI Project Review Summary:
- Feasibility Score: ${project.projectReview.feasibilityScore || 'N/A'}
- Problem-Solution Alignment: ${project.projectReview.problemSolutionAlignment || 'N/A'}
- Must Build: ${(project.projectReview.mustBuildFeatures || []).join(', ')}
- Risks: ${(project.projectReview.projectRisks || []).join(', ')}
- Missing Skills: ${(project.projectReview.missingSkills || []).join(', ')}
`;
  }

  return ctx;
};

// @desc    Generate AI Task Plan for a project
// @route   POST /api/projects/:projectId/generate-task-plan
// @access  Private (team members only)
exports.generateTaskPlan = async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1. Fetch Project
    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // 2. Fetch Team and check membership
    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    // 3. Validate: At least one feature required
    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please configure at least one feature before generating a task plan.'
      });
    }

    // 4. Validate: At least one team member required
    if (!team.members || team.members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your team has no members. Add team members before generating a task plan.'
      });
    }

    // 5. Build context string
    const contextString = buildContextString(project, team);
    const members = team.members.map(m => ({
      name: m.name,
      skills: m.skills || []
    }));

    // 6. Call AI Service
    console.log(`Running AI Task Plan generation for project: ${project.projectName}...`);
    const taskPlanData = await generateTaskPlanWithAI(contextString, members);

    // 7. Save task plan in project
    project.taskPlan = taskPlanData;
    project.taskPlanGeneratedAt = new Date();
    await project.save();

    res.status(200).json({
      success: true,
      taskPlan: project.taskPlan,
      taskPlanGeneratedAt: project.taskPlanGeneratedAt
    });
  } catch (error) {
    console.error('generateTaskPlan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during task plan generation'
    });
  }
};

// @desc    Regenerate AI Task Plan (overwrite existing)
// @route   POST /api/projects/:projectId/regenerate-task-plan
// @access  Private (team members only)
exports.regenerateTaskPlan = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name skills');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team linked to this project not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    if (!project.featuresToBuild || project.featuresToBuild.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please configure at least one feature before regenerating the task plan.'
      });
    }

    if (!team.members || team.members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your team has no members. Add team members before generating a task plan.'
      });
    }

    const contextString = buildContextString(project, team);
    const members = team.members.map(m => ({
      name: m.name,
      skills: m.skills || []
    }));

    console.log(`Regenerating AI Task Plan for project: ${project.projectName}...`);
    const taskPlanData = await generateTaskPlanWithAI(contextString, members);

    // Overwrite old task plan
    project.taskPlan = taskPlanData;
    project.taskPlanGeneratedAt = new Date();
    await project.save();

    res.status(200).json({
      success: true,
      taskPlan: project.taskPlan,
      taskPlanGeneratedAt: project.taskPlanGeneratedAt
    });
  } catch (error) {
    console.error('regenerateTaskPlan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during task plan regeneration'
    });
  }
};

// @desc    Update status of a specific assigned task
// @route   PATCH /api/projects/:projectId/task-plan/task-status
// @access  Private (only the assigned member can update their own tasks)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { memberName, taskName, status } = req.body;

    if (!memberName || !taskName || !status) {
      return res.status(400).json({ success: false, message: 'memberName, taskName, and status are required' });
    }

    const validStatuses = ['Not Started', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const project = await Project.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const team = await Team.findById(project.teamId).populate('members', 'name');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Verify the requesting user is a team member
    const requestingMember = team.members.find(member => isSameUser(member, req.user.id));
    if (!requestingMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this team' });
    }

    // Enforce ownership: only the assigned member can update their own tasks
    if (requestingMember.name !== memberName) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You can only update your own tasks. You are logged in as "${requestingMember.name}", not "${memberName}".`
      });
    }

    if (!project.taskPlan || !project.taskPlan.assignments) {
      return res.status(400).json({ success: false, message: 'No task plan exists for this project' });
    }

    // Find the assignment for the member
    const assignment = project.taskPlan.assignments.find(a => a.member === memberName);
    if (!assignment) {
      return res.status(404).json({ success: false, message: `No assignment found for member: ${memberName}` });
    }

    // Find the task
    const taskEntry = assignment.assignedTasks.find(t => t.task === taskName);
    if (!taskEntry) {
      return res.status(404).json({ success: false, message: `Task not found: ${taskName}` });
    }

    // Update status
    taskEntry.status = status;
    taskEntry.updatedAt = new Date();

    // Mark as modified for mongoose (nested objects need explicit marking)
    project.markModified('taskPlan');
    await project.save();

    res.status(200).json({
      success: true,
      message: `Task status updated to "${status}"`,
      taskPlan: project.taskPlan
    });
  } catch (error) {
    console.error('updateTaskStatus error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating task status'
    });
  }
};
