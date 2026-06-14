const Team = require('../models/Team');
const User = require('../models/User');
const { generateInviteCode } = require('../utils/inviteCode');

// @desc    Create a new team
// @route   POST /api/team/create
// @access  Private
exports.createTeam = async (req, res) => {
  try {
    const { teamName, description } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    // Generate unique invite code
    const inviteCode = await generateInviteCode();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/join/${inviteCode}`;

    // Create new team
    const team = new Team({
      teamName: teamName.trim(),
      description: description ? description.trim() : '',
      inviteCode,
      createdBy: req.user.id,
      members: [req.user.id] // Creator is automatically the first member
    });

    await team.save();

    res.status(201).json({
      success: true,
      team,
      inviteCode,
      inviteLink
    });
  } catch (error) {
    console.error('createTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Join a team using an invite code
// @route   POST /api/team/join
// @access  Private
exports.joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const code = inviteCode.toUpperCase().trim();

    // Find team by invite code
    const team = await Team.findOne({ inviteCode: code });
    if (!team) {
      return res.status(404).json({ message: 'Team not found with the provided invite code' });
    }

    // Check if user is already a member of the team
    const isMember = team.members.some(memberId => memberId.toString() === req.user.id);
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    // Add user to members array
    team.members.push(req.user.id);
    
    // Invalidate existing team analysis
    team.analysis = null;
    team.analysisGeneratedAt = null;
    team.analysisVersion = (team.analysisVersion || 0) + 1;
    
    await team.save();

    res.status(200).json({
      success: true,
      message: 'Joined team successfully',
      team
    });
  } catch (error) {
    console.error('joinTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all teams for the logged-in user
// @route   GET /api/team/my-teams
// @access  Private
exports.getMyTeams = async (req, res) => {
  try {
    // Return all teams where current user exists in members array
    const teams = await Team.find({ members: req.user.id });
    res.status(200).json(teams);
  } catch (error) {
    console.error('getMyTeams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get team details
// @route   GET /api/team/:teamId
// @access  Private
exports.getTeamDetails = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId)
      .populate('createdBy', 'name email skills avatar')
      .populate('members', 'name email skills avatar');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify if the user is a member of the team
    const isMember = team.members.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === req.user.id;
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this team' });
    }

    // Include invite link in the response
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/join/${team.inviteCode}`;

    const teamObj = team.toObject ? team.toObject() : team;
    teamObj.inviteLink = inviteLink;

    res.status(200).json(teamObj);
  } catch (error) {
    console.error('getTeamDetails error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper for comparing user IDs (handles populated user objects and ObjectIds)
const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

// @desc    Leave a team
// @route   DELETE /api/team/:teamId/leave
// @access  Private
exports.leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify user is in team members array
    const isMember = team.members.some(member => isSameUser(member, req.user.id));
    if (!isMember) {
      return res.status(400).json({ message: 'You are not a member of this team' });
    }

    // Verify user is NOT the owner
    const isOwner = isSameUser(team.createdBy, req.user.id);
    if (isOwner) {
      return res.status(400).json({ message: 'Owner cannot leave team. Transfer ownership first.' });
    }

    // Remove user from members
    team.members = team.members.filter(member => !isSameUser(member, req.user.id));
    
    // Invalidate existing team analysis
    team.analysis = null;
    team.analysisGeneratedAt = null;
    team.analysisVersion = (team.analysisVersion || 0) + 1;
    
    await team.save();

    res.status(200).json({
      success: true,
      message: 'Left team successfully'
    });
  } catch (error) {
    console.error('leaveTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a member from the team
// @route   DELETE /api/team/:teamId/member/:memberId
// @access  Private
exports.removeMember = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify requester is team owner
    const isOwner = isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the team owner can remove members' });
    }

    // Verify target user is NOT the owner
    if (isSameUser(memberId, req.user.id)) {
      return res.status(400).json({ message: 'Owner cannot remove themselves' });
    }

    // Verify target user exists in the team
    const isMember = team.members.some(member => isSameUser(member, memberId));
    if (!isMember) {
      return res.status(404).json({ message: 'Member not found in this team' });
    }

    // Remove member
    team.members = team.members.filter(member => !isSameUser(member, memberId));
    
    // Invalidate existing team analysis
    team.analysis = null;
    team.analysisGeneratedAt = null;
    team.analysisVersion = (team.analysisVersion || 0) + 1;
    
    await team.save();

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('removeMember error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Transfer team ownership
// @route   PATCH /api/team/:teamId/transfer-owner
// @access  Private
exports.transferOwnership = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { newOwnerId } = req.body;
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify requester is team owner
    const isOwner = isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the team owner can transfer ownership' });
    }

    if (!newOwnerId) {
      return res.status(400).json({ message: 'New owner ID is required' });
    }

    // Verify new owner exists in team
    const isMember = team.members.some(member => isSameUser(member, newOwnerId));
    if (!isMember) {
      return res.status(400).json({ message: 'New owner must be a team member' });
    }

    // Update owner
    team.createdBy = newOwnerId;
    
    // Invalidate existing team analysis
    team.analysis = null;
    team.analysisGeneratedAt = null;
    team.analysisVersion = (team.analysisVersion || 0) + 1;
    
    await team.save();

    res.status(200).json({
      success: true,
      message: 'Ownership transferred successfully'
    });
  } catch (error) {
    console.error('transferOwnership error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a team
// @route   DELETE /api/team/:teamId
// @access  Private
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify requester is owner
    const isOwner = isSameUser(team.createdBy, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the team owner can delete this team' });
    }

    // Delete team document
    await team.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('deleteTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

