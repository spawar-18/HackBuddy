const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  submitFeedback,
  getAllFeedback,
  getAISummary,
  getFeedbackStats,
  updateFeedbackStatus
} = require('../controller/feedbackController');

// POST /api/feedback - Submit new feedback
router.post('/', authMiddleware, submitFeedback);

// GET /api/feedback - Get all feedback (with filters & pagination)
router.get('/', authMiddleware, getAllFeedback);

// GET /api/feedback/summary - AI-powered feedback summary
router.get('/summary', authMiddleware, getAISummary);

// GET /api/feedback/stats - Feedback statistics & analytics
router.get('/stats', authMiddleware, getFeedbackStats);

// PATCH /api/feedback/:id/status - Update feedback status
router.patch('/:id/status', authMiddleware, updateFeedbackStatus);

module.exports = router;
