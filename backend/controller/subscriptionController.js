const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const subscriptionService = require('../services/subscriptionService');
const Team = require('../models/Team');
const User = require('../models/User');

const razorpayKeyId = process.env.RAZORPAY_API || 'rzp_test_T6qFrydByGoFtA';
const razorpayKeySecret = process.env.RAZORPAY_SECRET || 'QEClhzdGJ366EaRDI3q6RYsI';

// Initialize Razorpay instance
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret
  });
} catch (err) {
  console.error('Razorpay initialization failed:', err);
}

/**
 * GET /api/subscription/status
 * Returns current plan, team usage counts and paid-feature limits.
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const sub = await subscriptionService.getOrCreateSubscription(userId);

    const teamsOwned = await Team.countDocuments({ createdBy: userId });
    const maxTeams = sub.plan === 'FREE' ? 2 : 'Unlimited';

    return res.status(200).json({
      success: true,
      subscription: sub,
      limits: {
        teamsOwned,
        maxTeams,
        plan: sub.plan
      }
    });
  } catch (error) {
    console.error('subscriptionController.getStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving subscription status.'
    });
  }
};

/**
 * POST /api/subscription/create-order
 * Creates a Razorpay order for PRO (₹299) or TEAM (₹999).
 */
exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['PRO', 'TEAM'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan. Choose PRO or TEAM.' });
    }

    // Amount in paise: PRO = ₹299, TEAM = ₹999
    const amount = plan === 'PRO' ? 29900 : 99900;

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay payment gateway is not initialized.'
      });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `hb_${Date.now()}`,
      payment_capture: 1
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId
    });
  } catch (error) {
    console.error('subscriptionController.createOrder error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Razorpay order creation failed.'
    });
  }
};

/**
 * POST /api/subscription/verify-payment
 * Validates Razorpay signature and upgrades the user's plan.
 * Prevents duplicate payments by checking existing paymentId.
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment details or plan.'
      });
    }

    if (!['PRO', 'TEAM'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    // Prevent duplicate payments
    const duplicate = await Subscription.findOne({ paymentId: razorpay_payment_id });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'This payment has already been processed.'
      });
    }

    // Verify Razorpay HMAC signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Transaction verification failed.'
      });
    }

    // Activate subscription and sync User.subscriptionPlan
    const sub = await subscriptionService.activatePlan(req.user.id, plan, {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    return res.status(200).json({
      success: true,
      message: `Successfully upgraded to HackBuddy ${plan} Workspace!`,
      subscription: sub
    });
  } catch (error) {
    console.error('subscriptionController.verifyPayment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed.'
    });
  }
};

/**
 * POST /api/subscription/cancel
 * Cancels the subscription (sets status to cancelled).
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const sub = await subscriptionService.getOrCreateSubscription(req.user.id);
    sub.status = 'cancelled';
    await sub.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled.',
      subscription: sub
    });
  } catch (error) {
    console.error('subscriptionController.cancelSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription.'
    });
  }
};

/**
 * GET /api/subscription/admin-analytics
 * SaaS admin metrics: user counts, revenue, conversion rate.
 */
exports.getAdminAnalytics = async (req, res) => {
  try {
    const allSubscriptions = await Subscription.find({});
    const allUsers = await User.find({});

    const totalUsers = allUsers.length || 1;
    const freeUsers = allSubscriptions.filter(s => s.plan === 'FREE').length;
    const proUsers = allSubscriptions.filter(s => s.plan === 'PRO').length;
    const teamUsers = allSubscriptions.filter(s => s.plan === 'TEAM').length;

    const paidUsers = proUsers + teamUsers;
    const conversionRate = parseFloat(((paidUsers / totalUsers) * 100).toFixed(2));

    // Simple revenue: count paid subscriptions × price
    const monthlyRevenue = (proUsers * 299) + (teamUsers * 999);
    const projectedARR = monthlyRevenue * 12;

    const mostPurchasedPlan = proUsers >= teamUsers ? 'PRO' : 'TEAM';

    return res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        freeUsers,
        proUsers,
        teamUsers,
        monthlyRevenue,
        projectedARR,
        conversionRate,
        mostPurchasedPlan,
        planDistribution: [
          { name: 'FREE', value: freeUsers },
          { name: 'PRO', value: proUsers },
          { name: 'TEAM', value: teamUsers }
        ]
      }
    });
  } catch (error) {
    console.error('subscriptionController.getAdminAnalytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving admin analytics.'
    });
  }
};
