/**
 * HackBuddy Subscription and SaaS Platform - Automated Test Suite
 *
 * Tests that:
 * 1. Default subscription is initialized as FREE plan
 * 2. Free users can access basic AI modules (chatWithMentor)
 * 3. Free users are blocked from accessing premium modules (analyzeHackathonCommandCenter)
 * 4. Free users can create up to 2 teams, and the 3rd team creation is blocked
 * 5. Payment succeeds, upgrading the user to PRO
 * 6. PRO plan unlocks unlimited team creation and premium APIs
 * 7. Admin SaaS Analytics returns correct plan distribution statistics
 *
 * Run with: node backend/tests/subscription.test.js
 */

const path = require('path');
const BACKEND_ROOT = path.resolve(__dirname, '..');

const c = {
  green: '\x1b[32m',
  red:   '\x1b[31m',
  cyan:  '\x1b[36m',
  yellow:'\x1b[33m',
  bold:  '\x1b[1m',
  reset: '\x1b[0m',
};

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ${c.green}✓${c.reset} ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  ${c.red}✗${c.reset} ${name}${detail ? `\n      → ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${c.cyan}${c.bold}▸ ${title}${c.reset}`);
}

// Set up mock process variables
process.env.JWT_SECRET = 'test_secret';

// Import Models & Services
const Subscription = require('../models/Subscription');
const subscriptionService = require('../services/subscriptionService');
const Team = require('../models/Team');
const User = require('../models/User');

(async () => {
  try {
    const mockUserId = '507f1f77bcf86cd799439011';

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Subscription Initialization
    // ─────────────────────────────────────────────────────────────────────────────
    section('Subscription Initialization');
    
    // Clean up any existing mocks
    const userObj = new User({ _id: mockUserId, name: 'Test User', email: 'test@example.com' });
    await userObj.save();

    const sub = await subscriptionService.getOrCreateSubscription(mockUserId);
    assert(
      'New user automatically initialized with FREE plan',
      sub.plan === 'FREE' && sub.status === 'active',
      `Got plan=${sub.plan}, status=${sub.status}`
    );

    const userPlan = await subscriptionService.getUserPlan(mockUserId);
    assert(
      'User plan defaults to FREE',
      userPlan === 'FREE',
      `Got userPlan=${userPlan}`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. AI Gating
    // ─────────────────────────────────────────────────────────────────────────────
    section('AI Gating');

    // Under Free plan: check access to allowed free modules
    let accessFreeAllowed = true;
    try {
      await subscriptionService.checkAICap(mockUserId, 'chatWithMentor');
    } catch (e) {
      accessFreeAllowed = false;
    }
    assert(
      'Free users can access basic AI modules (chatWithMentor)',
      accessFreeAllowed
    );

    // Under Free plan: check access to premium modules
    let accessPremiumAllowed = false;
    let premiumErrorMessage = '';
    try {
      await subscriptionService.checkAICap(mockUserId, 'analyzeHackathonCommandCenter');
      accessPremiumAllowed = true;
    } catch (e) {
      premiumErrorMessage = e.message;
    }
    assert(
      'Free users are blocked from accessing premium modules (analyzeHackathonCommandCenter)',
      !accessPremiumAllowed && premiumErrorMessage.includes('premium AI capability'),
      `Got error: "${premiumErrorMessage}"`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Team Limit Guard
    // ─────────────────────────────────────────────────────────────────────────────
    section('Team Limit Guard');

    // Stub Team.countDocuments to return 0, 1, 2 to simulate team count
    const origCount = Team.countDocuments;
    
    // Test 1st team (count = 0)
    Team.countDocuments = async () => 0;
    let check1 = true;
    try {
      await subscriptionService.checkTeamLimit(mockUserId);
    } catch (e) {
      check1 = false;
    }
    assert('First team creation is allowed', check1);

    // Test 2nd team (count = 1)
    Team.countDocuments = async () => 1;
    let check2 = true;
    try {
      await subscriptionService.checkTeamLimit(mockUserId);
    } catch (e) {
      check2 = false;
    }
    assert('Second team creation is allowed', check2);

    // Test 3rd team (count = 2)
    Team.countDocuments = async () => 2;
    let check3 = true;
    let teamLimitErrorMessage = '';
    try {
      await subscriptionService.checkTeamLimit(mockUserId);
    } catch (e) {
      check3 = false;
      teamLimitErrorMessage = e.message;
    }
    assert(
      'Third team creation is blocked with TEAM_LIMIT_REACHED error',
      !check3 && teamLimitErrorMessage.includes('limit of 2 free teams'),
      `Got error: "${teamLimitErrorMessage}"`
    );

    // Reset stub
    Team.countDocuments = origCount;

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Payment Verification and Subscription Upgrade
    // ─────────────────────────────────────────────────────────────────────────────
    section('Payment Verification and Subscription Upgrade');

    const crypto = require('crypto');
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const signatureSecret = 'QEClhzdGJ366EaRDI3q6RYsI';
    const rawSignature = orderId + '|' + paymentId;
    const testSignature = crypto
      .createHmac('sha256', signatureSecret)
      .update(rawSignature)
      .digest('hex');

    // Perform upgrade activation via service
    const upgradedSubDoc = await subscriptionService.activatePlan(mockUserId, 'PRO', {
      orderId,
      paymentId,
      signature: testSignature
    });

    assert(
      'Subscription plan is updated to PRO and status remains active',
      upgradedSubDoc.plan === 'PRO' && upgradedSubDoc.status === 'active',
      `Got plan=${upgradedSubDoc.plan}, status=${upgradedSubDoc.status}`
    );

    const userAfterUpgrade = await User.findById(mockUserId);
    assert(
      'User subscriptionPlan field is synced to PRO',
      userAfterUpgrade.subscriptionPlan === 'PRO',
      `Got User.subscriptionPlan=${userAfterUpgrade.subscriptionPlan}`
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. Unlimited Gating post Upgrade
    // ─────────────────────────────────────────────────────────────────────────────
    section('Unlimited Gating Post-Upgrade');

    let proAccessAllowed = true;
    try {
      await subscriptionService.checkAICap(mockUserId, 'analyzeHackathonCommandCenter');
    } catch (e) {
      proAccessAllowed = false;
    }
    assert(
      'PRO plan unlocks premium Command Center module',
      proAccessAllowed
    );

    // Verify team limit is now bypassed
    Team.countDocuments = async () => 5; // count = 5
    let checkUnlimitedTeams = true;
    try {
      await subscriptionService.checkTeamLimit(mockUserId);
    } catch (e) {
      checkUnlimitedTeams = false;
    }
    assert('PRO plan allows creating unlimited teams (greater than 2)', checkUnlimitedTeams);

    // Reset stub
    Team.countDocuments = origCount;

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. Admin Analytics
    // ─────────────────────────────────────────────────────────────────────────────
    section('SaaS Admin Analytics Dashboard');

    const subscriptionController = require('../controller/subscriptionController');
    const reqMock = { user: { id: mockUserId } };
    let analyticsData = null;
    const resMock = {
      status: (code) => {
        return {
          json: (data) => {
            analyticsData = data;
          }
        }
      }
    };

    await subscriptionController.getAdminAnalytics(reqMock, resMock);
    
    assert(
      'Admin analytics retrieves metrics successfully',
      analyticsData && analyticsData.success === true && analyticsData.analytics,
      `Response: ${JSON.stringify(analyticsData)}`
    );

    if (analyticsData && analyticsData.analytics) {
      const stats = analyticsData.analytics;
      assert(
        'Projected SaaS ARR is calculated correctly',
        stats.projectedARR === stats.monthlyRevenue * 12,
        `ARR: ${stats.projectedARR}, MRR: ${stats.monthlyRevenue}`
      );
      assert(
        'Admin dashboard provides a plan distribution breakdown',
        Array.isArray(stats.planDistribution) && stats.planDistribution.length > 0,
        `Distribution: ${JSON.stringify(stats.planDistribution)}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log(
      `${c.bold}Subscription Tests: ${passed + failed}  ` +
      `${c.green}Passed: ${passed}${c.reset}  ` +
      `${c.red}Failed: ${failed}${c.reset}`
    );

    if (failures.length > 0) {
      console.log(`\n${c.red}${c.bold}Failures:${c.reset}`);
      failures.forEach(({ name, detail }) => {
        console.log(`  ${c.red}✗${c.reset} ${name}`);
        if (detail) console.log(`    ${c.yellow}→ ${detail}${c.reset}`);
      });
    }

    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
})();
