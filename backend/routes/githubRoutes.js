const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const {
  connectRepository,
  disconnectRepository,
  getRepositoryStatus,
  getRepositoryAnalytics,
  manualSync,
  triggerRepositoryAnalysis,
  getProjectRealityCheck
} = require('../controller/githubController');

// All routes are protected with auth middleware
// Base path: /api/projects/:projectId/hackathon/github

// Connection management (Owner only)
router.post('/connect', authMiddleware, connectRepository);
router.delete('/disconnect', authMiddleware, disconnectRepository);

// Repository data (all members)
router.get('/status', authMiddleware, getRepositoryStatus);
router.get('/analytics', authMiddleware, getRepositoryAnalytics);
router.get('/reality-check', authMiddleware, getProjectRealityCheck);

// Sync (Owner only)
router.post('/sync', authMiddleware, manualSync);

// AI Analysis (all members)
router.post('/analyze', authMiddleware, triggerRepositoryAnalysis);

module.exports = router;
