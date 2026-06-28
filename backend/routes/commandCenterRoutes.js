const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const { requirePro } = require('../middleware/subscriptionGate');
const {
  saveHackathonConfig,
  getHackathonConfig,
  getCommandCenterDashboard,
  triggerCommandCenterAnalysis,
  getInAppNotifications,
  markNotificationsAsRead
} = require('../controller/commandCenterController');

// PRO/TEAM required: AI Command Center features
router.post('/config', authMiddleware, requirePro, saveHackathonConfig);
router.get('/config', authMiddleware, requirePro, getHackathonConfig);
router.get('/dashboard', authMiddleware, requirePro, getCommandCenterDashboard);
router.post('/analyze', authMiddleware, requirePro, triggerCommandCenterAnalysis);

// Available to all authenticated users: in-app notifications
router.get('/notifications', authMiddleware, getInAppNotifications);
router.post('/notifications/read', authMiddleware, markNotificationsAsRead);

module.exports = router;


