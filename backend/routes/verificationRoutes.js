const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const {
  verifyCompletedTask,
  overrideTaskVerification,
  getTaskVerificationStatus,
  getVerificationDashboardStats,
  getAllVerifications
} = require('../controller/verificationController');

// Base path: /api/projects/:projectId/verification

// Verification actions
router.post('/verify', authMiddleware, verifyCompletedTask);
router.post('/override', authMiddleware, overrideTaskVerification);

// Query status and stats
router.get('/status', authMiddleware, getTaskVerificationStatus);
router.get('/dashboard', authMiddleware, getVerificationDashboardStats);
router.get('/all', authMiddleware, getAllVerifications);

module.exports = router;
