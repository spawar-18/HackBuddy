const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireTeam } = require('../middleware/subscriptionGate');
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

// All marketplace routes require TEAM subscription
router.post('/tasks/request-reassignment', authMiddleware, requireTeam, requestReassignment);
router.post('/tasks/request-swap', authMiddleware, requireTeam, requestSwap);
router.post('/tasks/request-collaborator', authMiddleware, requireTeam, requestCollaborator);
router.post('/tasks/claim-task', authMiddleware, requireTeam, claimTask);

router.get('/projects/:projectId/marketplace', authMiddleware, requireTeam, getMarketplace);

router.patch('/marketplace/:requestId/approve', authMiddleware, requireTeam, approveRequest);
router.patch('/marketplace/:requestId/reject', authMiddleware, requireTeam, rejectRequest);

module.exports = router;

