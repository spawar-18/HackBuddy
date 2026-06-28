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

// All command center endpoints require PRO or TEAM subscription
router.post('/config', authMiddleware, requirePro, saveHackathonConfig);
router.get('/config', authMiddleware, requirePro, getHackathonConfig);
router.get('/dashboard', authMiddleware, requirePro, getCommandCenterDashboard);
router.post('/analyze', authMiddleware, requirePro, triggerCommandCenterAnalysis);
router.get('/notifications', authMiddleware, requirePro, getInAppNotifications);
router.post('/notifications/read', authMiddleware, requirePro, markNotificationsAsRead);

module.exports = router;

