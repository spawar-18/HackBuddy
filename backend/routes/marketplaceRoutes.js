const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  requestReassignment,
  requestSwap,
  requestCollaborator,
  requestHelp,
  claimTask,
  getMarketplace,
  approveRequest,
  rejectRequest
} = require('../controller/marketplaceController');

// Task request routes
router.post('/tasks/request-reassignment', authMiddleware, requestReassignment);
router.post('/tasks/request-swap', authMiddleware, requestSwap);
router.post('/tasks/request-collaborator', authMiddleware, requestCollaborator);
router.post('/tasks/request-help', authMiddleware, requestHelp);
router.post('/tasks/claim-task', authMiddleware, claimTask);

// Marketplace query routes
router.get('/projects/:projectId/marketplace', authMiddleware, getMarketplace);

// Owner response routes
router.patch('/marketplace/:requestId/approve', authMiddleware, approveRequest);
router.patch('/marketplace/:requestId/reject', authMiddleware, rejectRequest);

module.exports = router;
