const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { checkAICap } = require('../middleware/subscriptionGate');
const { execute, getAnalytics } = require('../controller/aiController');

// POST /api/ai/execute - Single entry point for AI operations
router.post('/execute', authMiddleware, checkAICap, execute);

// GET /api/ai/analytics - Get AI performance metrics
router.get('/analytics', authMiddleware, getAnalytics);

module.exports = router;
