const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const { requirePro } = require('../middleware/subscriptionGate');
const {
  connectRepository,
  disconnectRepository,
  getRepositoryStatus,
  getRepositoryAnalytics,
  manualSync,
  triggerRepositoryAnalysis,
  getProjectRealityCheck
} = require('../controller/githubController');

// Base path: /api/projects/:projectId/hackathon/github

// Connection management (Owner only) — auth only, no plan required
router.post('/connect', authMiddleware, connectRepository);
router.delete('/disconnect', authMiddleware, disconnectRepository);

// Repository status — auth only
router.get('/status', authMiddleware, getRepositoryStatus);

// GitHub Intelligence features — require PRO or TEAM
router.get('/analytics', authMiddleware, requirePro, getRepositoryAnalytics);
router.get('/reality-check', authMiddleware, requirePro, getProjectRealityCheck);
router.post('/sync', authMiddleware, requirePro, manualSync);
router.post('/analyze', authMiddleware, requirePro, triggerRepositoryAnalysis);

module.exports = router;

