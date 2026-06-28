const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getStatus,
  createOrder,
  verifyPayment,
  cancelSubscription,
  getAdminAnalytics
} = require('../controller/subscriptionController');

// Get subscription status and usage limits
router.get('/status', authMiddleware, getStatus);

// Create Razorpay order
router.post('/create-order', authMiddleware, createOrder);

// Verify Razorpay payment signature
router.post('/verify-payment', authMiddleware, verifyPayment);

// Cancel subscription / disable auto-renewal
router.post('/cancel', authMiddleware, cancelSubscription);

// Get SaaS admin analytics dashboard data
router.get('/admin-analytics', authMiddleware, getAdminAnalytics);

module.exports = router;
