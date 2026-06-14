const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getChatHistory, sendChatMessage } = require('../controller/chatController');

// GET /api/project/:projectId/chat - Retrieve recent conversation history
router.get('/:projectId/chat', authMiddleware, getChatHistory);

// POST /api/project/:projectId/chat - Send a user message and receive AI response
router.post('/:projectId/chat', authMiddleware, sendChatMessage);

module.exports = router;
