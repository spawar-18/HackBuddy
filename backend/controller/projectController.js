const Project = require('../models/Project');
const Team = require('../models/Team');

// Helper to compare user IDs (handles populated user objects and ObjectIds)
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

// @desc    Create a new project linked to a team
// @route   POST /api/project
// @access  Private
exports.createProject = async (req, res) => {
  try {
    const { 
      projectName, 
      problemStatement, 
      description, 
      track, 
      duration, 
      featuresToBuild, 
      teamId 
    } = req.body;

    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required to link the project' });
    }

    // 1. Fetch team and check membership
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this team' });
    }

    // 2. Check if a project already exists for this team
    const existingProject = await Project.findOne({ teamId });
    if (existingProject) {
      return res.status(400).json({ message: 'A project is already registered for this team' });
    }

    // 3. Create project
    const project = new Project({
      projectName: projectName.trim(),
      problemStatement: problemStatement ? problemStatement.trim() : '',
      description: description ? description.trim() : '',
      track: track ? track.trim() : '',
      duration: duration ? duration.trim() : '',
      featuresToBuild: Array.isArray(featuresToBuild) ? featuresToBuild.filter(f => f.trim().length > 0) : [],
      teamId,
      createdBy: req.user.id,
      status: 'Planning'
    });

    await project.save();

    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({ message: 'Server error during project creation' });
  }
};

// @desc    Get project details by team ID
// @route   GET /api/project/team/:teamId
// @access  Private
exports.getProjectByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Fetch team and check membership
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this team' });
    }

    const project = await Project.findOne({ teamId });
    
    res.status(200).json({
      success: true,
      project: project || null
    });
  } catch (error) {
    console.error('getProjectByTeam error:', error);
    res.status(500).json({ message: 'Server error fetching project details' });
  }
};

// @desc    Get project details by project ID
// @route   GET /api/project/:projectId
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check team membership
    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team linked to this project not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the linked team' });
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('getProject error:', error);
    res.status(500).json({ message: 'Server error fetching project details' });
  }
};

// @desc    Update project details
// @route   PUT /api/project/:projectId
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      projectName, 
      problemStatement, 
      description, 
      track, 
      duration, 
      featuresToBuild, 
      status 
    } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check team membership
    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team linked to this project not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the linked team' });
    }

    if (projectName !== undefined) {
      if (!projectName || !projectName.trim()) {
        return res.status(400).json({ message: 'Project name cannot be empty' });
      }
      project.projectName = projectName.trim();
    }

    if (problemStatement !== undefined) project.problemStatement = problemStatement.trim();
    if (description !== undefined) project.description = description.trim();
    if (track !== undefined) project.track = track.trim();
    if (duration !== undefined) project.duration = duration.trim();
    if (featuresToBuild !== undefined) {
      project.featuresToBuild = Array.isArray(featuresToBuild) ? featuresToBuild.filter(f => f.trim().length > 0) : [];
    }
    if (status !== undefined) {
      if (!['Planning', 'In Progress', 'Completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      project.status = status;
    }

    await project.save();

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('updateProject error:', error);
    res.status(500).json({ message: 'Server error updating project' });
  }
};

// @desc    Delete project
// @route   DELETE /api/project/:projectId
// @access  Private
exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check team membership
    const team = await Team.findById(project.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team linked to this project not found' });
    }

    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the linked team' });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ message: 'Server error during project deletion' });
  }
};
