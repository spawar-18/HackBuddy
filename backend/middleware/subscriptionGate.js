const subscriptionService = require('../services/subscriptionService');

/**
 * checkTeamLimit
 * Blocks team creation once a FREE user owns 2 teams.
 * Returns structured { reason: 'TEAM_LIMIT_REACHED' } on 403 so the
 * frontend knows to open the Upgrade Modal instead of showing an error toast.
 */
const checkTeamLimit = async (req, res, next) => {
  try {
    await subscriptionService.checkTeamLimit(req.user.id);
    next();
  } catch (error) {
    if (error.reason === 'TEAM_LIMIT_REACHED') {
      return res.status(403).json({
        success: false,
        reason: 'TEAM_LIMIT_REACHED',
        message: 'You have reached the limit of 2 free teams.'
      });
    }
    return res.status(403).json({
      success: false,
      message: error.message || 'Team creation denied.'
    });
  }
};

/**
 * checkProjectLimit
 * Enforces project limits if any.
 */
const checkProjectLimit = async (req, res, next) => {
  try {
    await subscriptionService.checkProjectLimit(req.user.id);
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message || 'Project creation denied.'
    });
  }
};

/**
 * checkAICap
 * Enforces AI feature access policies.
 */
const checkAICap = async (req, res, next) => {
  try {
    const moduleName = req.body.module || req.query.module;
    if (!moduleName) {
      return next();
    }
    await subscriptionService.checkAICap(req.user.id, moduleName);
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message || 'AI capability access denied.'
    });
  }
};

/**
 * requirePro
 * Protects routes that need at least a PRO subscription.
 * Covers: Smart Alerts, AI Command Center, GitHub Intelligence.
 */
const requirePro = async (req, res, next) => {
  try {
    const plan = await subscriptionService.getUserPlan(req.user.id);
    if (plan === 'PRO' || plan === 'TEAM') {
      return next();
    }
    return res.status(403).json({
      success: false,
      reason: 'PRO_REQUIRED',
      message: 'This feature requires a Pro or Team workspace. Please upgrade to continue.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Subscription check failed.'
    });
  }
};

/**
 * requireTeam
 * Protects routes that require a TEAM subscription.
 * Covers: AI Marketplace, Task Swapping, Collaboration Requests.
 */
const requireTeam = async (req, res, next) => {
  try {
    const plan = await subscriptionService.getUserPlan(req.user.id);
    if (plan === 'TEAM') {
      return next();
    }
    return res.status(403).json({
      success: false,
      reason: 'TEAM_PLAN_REQUIRED',
      message: 'This feature requires a Team workspace. Please upgrade to Team plan to continue.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Subscription check failed.'
    });
  }
};

module.exports = {
  checkTeamLimit,
  checkProjectLimit,
  checkAICap,
  requirePro,
  requireTeam
};
