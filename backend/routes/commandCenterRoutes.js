const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const {
  saveHackathonConfig,
  getHackathonConfig,
  getCommandCenterDashboard,
  triggerCommandCenterAnalysis,
  getInAppNotifications,
  markNotificationsAsRead
} = require('../controller/commandCenterController');

// All command center endpoints are protected
router.post('/config', authMiddleware, saveHackathonConfig);
router.get('/config', authMiddleware, getHackathonConfig);
router.get('/dashboard', authMiddleware, getCommandCenterDashboard);
router.post('/analyze', authMiddleware, triggerCommandCenterAnalysis);
router.get('/notifications', authMiddleware, getInAppNotifications);
router.post('/notifications/read', authMiddleware, markNotificationsAsRead);

module.exports = router;
