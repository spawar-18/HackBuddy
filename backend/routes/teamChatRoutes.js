const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getTeamMessages, sendTeamMessage, getTeamInfo } = require('../controller/teamChatController');

// GET /api/team-chat/:teamId/info - Team info and members
router.get('/:teamId/info', authMiddleware, getTeamInfo);

// GET /api/team-chat/:teamId/messages - Fetch chat messages (supports ?since=ISO_DATE for polling)
router.get('/:teamId/messages', authMiddleware, getTeamMessages);

// POST /api/team-chat/:teamId/messages - Send a message
router.post('/:teamId/messages', authMiddleware, sendTeamMessage);

module.exports = router;
