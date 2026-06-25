const TeamChat = require('../models/TeamChat');
const Team = require('../models/Team');
const User = require('../models/User');

/**
 * GET /api/team-chat/:teamId/messages?since=<ISO_DATE>&limit=<n>
 * Returns recent messages for a team (with optional since-timestamp for polling)
 */
const getTeamMessages = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { since, limit = 100 } = req.query;

    // Verify team exists and user is a member
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const userId = req.user.id || req.user._id;
    const isMember = team.members.some(m => m.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ message: 'You are not a member of this team' });

    let query = { teamId };
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }

    const messages = await TeamChat.find(query)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit));

    return res.json({ success: true, messages });
  } catch (err) {
    console.error('[TeamChat] getTeamMessages error:', err);
    return res.status(500).json({ message: 'Server error fetching messages' });
  }
};

/**
 * POST /api/team-chat/:teamId/messages
 * Send a message to the team chat
 */
const sendTeamMessage = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ message: 'Message too long (max 2000 characters)' });
    }

    // Verify team and membership
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const userId = req.user.id || req.user._id;
    const isMember = team.members.some(m => m.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ message: 'You are not a member of this team' });

    // Get user info for display
    const userDoc = await User.findById(userId);
    const userName = userDoc ? userDoc.name : (req.user.name || 'Unknown');
    const userAvatar = userDoc ? userDoc.avatar : null;

    const newMsg = await TeamChat.create({
      teamId,
      userId,
      userName,
      userAvatar,
      message: message.trim()
    });

    return res.status(201).json({ success: true, message: newMsg });
  } catch (err) {
    console.error('[TeamChat] sendTeamMessage error:', err);
    return res.status(500).json({ message: 'Server error sending message' });
  }
};

/**
 * GET /api/team-chat/:teamId/info
 * Returns team info including member list
 */
const getTeamInfo = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId).populate('members', 'name email avatar skills');
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const userId = req.user.id || req.user._id;
    const isMember = team.members.some(m => {
      const memberId = m._id ? m._id.toString() : m.toString();
      return memberId === userId.toString();
    });
    if (!isMember) return res.status(403).json({ message: 'You are not a member of this team' });

    return res.json({
      success: true,
      team: {
        _id: team._id,
        teamName: team.teamName,
        description: team.description,
        members: team.members
      }
    });
  } catch (err) {
    console.error('[TeamChat] getTeamInfo error:', err);
    return res.status(500).json({ message: 'Server error fetching team info' });
  }
};

module.exports = { getTeamMessages, sendTeamMessage, getTeamInfo };
