const Subscription = require('../models/Subscription');
const Team = require('../models/Team');
const User = require('../models/User');

class SubscriptionService {
  /**
   * Returns (or auto-creates) the subscription record for a user.
   * New users always start on FREE / active.
   */
  async getOrCreateSubscription(userId) {
    let sub = await Subscription.findOne({ userId });
    if (!sub) {
      sub = await Subscription.create({
        userId,
        plan: 'FREE',
        status: 'active'
      });
    }
    return sub;
  }

  /**
   * Returns the current plan for a user.
   * Reads subscriptionPlan from User document for speed; falls back to Subscription doc.
   */
  async getUserPlan(userId) {
    const user = await User.findById(userId);
    if (user && user.subscriptionPlan) return user.subscriptionPlan;
    const sub = await this.getOrCreateSubscription(userId);
    return sub.plan;
  }

  /**
   * Enforces the 2-team limit for FREE users.
   * Counts teams where createdBy === userId (owned teams only).
   * Throws a structured error that the gate middleware converts to HTTP 403.
   */
  async checkTeamLimit(userId) {
    const plan = await this.getUserPlan(userId);
    if (plan !== 'FREE') return; // PRO / TEAM — unlimited

    const ownedCount = await Team.countDocuments({ createdBy: userId });
    if (ownedCount >= 2) {
      const err = new Error('You have reached the limit of 2 free teams.');
      err.reason = 'TEAM_LIMIT_REACHED';
      throw err;
    }
  }

  /**
   * Check if project creation matches plan limit.
   * Free users are allowed to create projects within their 2 teams. No strict project count limit is imposed in freemium spec.
   */
  async checkProjectLimit(userId) {
    // Pass-through per Freemium spec (only team limit is enforced)
    return;
  }

  /**
   * Check if user is allowed to access the given AI module.
   */
  async checkAICap(userId, moduleName) {
    const plan = await this.getUserPlan(userId);
    if (plan === 'TEAM') {
      return; // TEAM plan has access to everything
    }

    // Pro features
    const proModules = [
      'analyzeHackathonCommandCenter',
      'analyzeGitHubRepository',
      'verifyTaskWithAI',
      'analyzeTeam'
    ];

    // Team features
    const teamModules = [
      'getMarketplaceRecommendation'
    ];

    if (teamModules.includes(moduleName)) {
      throw new Error('This feature requires a Team subscription.');
    }

    if (proModules.includes(moduleName) && plan === 'FREE') {
      throw new Error('This premium AI capability requires a Pro or Team workspace.');
    }
  }

  /**
   * Increment daily AI request count (no-op since there are no request caps on Free/Pro/Team plans).
   */
  async incrementAICount(userId) {
    // No-op for modern freemium subscription model
    return;
  }

  /**
   * Activates a paid plan on both Subscription doc and User.subscriptionPlan.
   */
  async activatePlan(userId, plan, paymentDetails) {
    // Update Subscription document
    let sub = await this.getOrCreateSubscription(userId);
    sub.plan = plan;
    sub.status = 'active';
    sub.razorpayOrderId = paymentDetails.orderId;
    sub.paymentId = paymentDetails.paymentId;
    sub.signature = paymentDetails.signature;
    await sub.save();

    // Sync subscriptionPlan on User document
    try {
      const user = await User.findById(userId);
      if (user) {
        user.subscriptionPlan = plan;
        await user.save();
      }
    } catch (e) {
      console.error('Failed to sync subscriptionPlan on User:', e);
    }

    return sub;
  }
}

module.exports = new SubscriptionService();
