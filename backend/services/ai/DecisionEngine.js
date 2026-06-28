const Project = require('../../models/Project');
const Team = require('../../models/Team');
const HackathonConfig = require('../../models/HackathonConfig');
const GitHubAnalyzer = require('./GitHubAnalyzer');
const FeatureAnalyzer = require('./FeatureAnalyzer');
const TaskAnalyzer = require('./TaskAnalyzer');
const MarketplaceAnalyzer = require('./MarketplaceAnalyzer');
const AlertEngine = require('./AlertEngine');
const ReportEngine = require('./ReportEngine');

// Local simple memory cache to optimize performance and prevent unnecessary recalculations
const cache = {
  // projectId: { timestamp, data }
};
const CACHE_TTL_MS = 10000; // 10 seconds cache to prevent multi-mount spikes but remain real-time

class DecisionEngine {
  async getDashboardData(projectId, bypassCache = false) {
    const cached = cache[projectId];
    const now = Date.now();
    if (!bypassCache && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`[DecisionEngine] Cache hit for project: ${projectId}`);
      return cached.data;
    }

    console.log(`[DecisionEngine] Calculating project intelligence state for project: ${projectId}...`);

    // 1. Fetch main database objects
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    const config = await HackathonConfig.findOne({ projectId });
    if (!config) {
      return { configured: false };
    }

    // Adjust status of config based on current time
    let statusChanged = false;
    const currentDate = new Date();
    if (config.status !== 'Completed' && config.status !== 'Cancelled') {
      if (currentDate >= config.endTime) {
        config.status = 'Completed';
        statusChanged = true;
      } else if (currentDate >= config.startTime && config.status === 'Upcoming') {
        config.status = 'Running';
        statusChanged = true;
      }
      if (statusChanged) {
        await config.save();
      }
    }

    const diffMs = config.endTime - currentDate;
    const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60));

    // Time remaining string representation
    let timeRemainingStr = '0 hours left';
    if (diffMs > 0) {
      const hoursLeft = Math.floor(hoursRemaining);
      const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (60 * 1000));
      timeRemainingStr = hoursLeft > 0 ? `${hoursLeft} hours, ${minutesLeft} minutes left` : `${minutesLeft} minutes left`;
    }

    // 2. Execute parallel modular analyzers
    const [gitHubAnalysis, marketplaceAnalysis] = await Promise.all([
      GitHubAnalyzer.analyze(projectId),
      MarketplaceAnalyzer.analyze(projectId)
    ]);

    const featuresAnalysis = FeatureAnalyzer.analyze(project);
    const taskAnalysis = TaskAnalyzer.analyze(project);

    // 3. Generate Alerts
    const alerts = AlertEngine.generateAlerts({
      featuresAnalysis,
      taskAnalysis,
      gitHubAnalysis,
      marketplaceAnalysis,
      hoursRemaining,
      config
    });

    // 4. Generate Timeline Events dynamically from real events
    const timelineEvents = [];

    // Milestone starts/freezes
    timelineEvents.push({
      time: config.startTime,
      event: `🚀 Hackathon Started: "${config.hackathonName}" is live!`,
      type: 'Info',
      healthImpact: 'Stable',
      riskImpact: 'Low'
    });

    if (config.codeFreezeTime) {
      timelineEvents.push({
        time: config.codeFreezeTime,
        event: '❄️ Code Freeze Deadline set',
        type: 'Milestone',
        healthImpact: 'Stable',
        riskImpact: 'Low'
      });
    }

    if (config.submissionTime) {
      timelineEvents.push({
        time: config.submissionTime,
        event: '📤 Final Submission Deadline set',
        type: 'Milestone',
        healthImpact: 'Stable',
        riskImpact: 'Low'
      });
    }

    // Add task completion events
    const assignments = project.taskPlan?.assignments || [];
    assignments.forEach(assign => {
      (assign.assignedTasks || []).forEach(t => {
        if (t.status === 'Completed') {
          timelineEvents.push({
            time: t.updatedAt || project.taskPlanGeneratedAt || new Date(),
            event: `✅ Task Completed: "${t.task}" by ${assign.member}`,
            type: 'Success',
            healthImpact: 'Improvement',
            riskImpact: 'Low'
          });
        } else if (t.status === 'Blocked') {
          timelineEvents.push({
            time: t.updatedAt || project.taskPlanGeneratedAt || new Date(),
            event: `⚠️ Task Blocked: "${t.task}" assigned to ${assign.member}`,
            type: 'Alert',
            healthImpact: 'Decline',
            riskImpact: 'High'
          });
        }
      });
    });

    // Add marketplace requests
    marketplaceAnalysis.activitySummary.forEach(act => {
      timelineEvents.push({
        time: act.createdAt,
        event: `🤝 Marketplace Request (${act.requestType}): "${act.task}" by ${act.member} is ${act.status}`,
        type: 'Decision',
        healthImpact: 'Stable',
        riskImpact: act.status === 'Approved' ? 'Low' : 'Medium'
      });
    });

    // Sort timeline chronologically (latest first)
    const sortedTimeline = timelineEvents
      .map(e => ({ ...e, time: new Date(e.time) }))
      .sort((a, b) => b.time - a.time);

    // 5. Generate AI Executive Report
    const executiveReport = ReportEngine.generateReport({
      project,
      featuresAnalysis,
      taskAnalysis,
      gitHubAnalysis,
      marketplaceAnalysis,
      hoursRemaining
    });

    // 6. Readiness scores calculation
    const judgeScore = Math.round(
      (taskAnalysis.completionPercentage * 0.4) +
      (featuresAnalysis.features.filter(f => f.status === 'Ready').length * 10) +
      (gitHubAnalysis.connected ? 20 : 0)
    );
    const deploymentScore = Math.round(
      (project.finalTechStack?.deployment ? 30 : 0) +
      (gitHubAnalysis.connected ? 20 : 0) +
      (taskAnalysis.completionPercentage * 0.5)
    );
    const demoScore = Math.round(
      (taskAnalysis.completionPercentage * 0.6) +
      (project.finalTechStack?.frontend ? 20 : 0) +
      (20) // Pitch ready base
    );
    const testingScore = Math.round(
      (gitHubAnalysis.connected ? 30 : 0) +
      (taskAnalysis.completionPercentage * 0.7)
    );

    const data = {
      success: true,
      configured: true,
      config,
      timeRemainingSeconds: Math.max(0, Math.floor(diffMs / 1000)),
      timeRemainingStr,
      progress: {
        totalTasks: taskAnalysis.totalTasks,
        completedTasks: taskAnalysis.completedTasks,
        inProgressTasks: taskAnalysis.inProgressTasks,
        pendingTasks: taskAnalysis.pendingTasks,
        blockedTasks: taskAnalysis.blockedTasks,
        completionPercentage: taskAnalysis.completionPercentage,
        criticalTasksTotal: taskAnalysis.criticalTasksTotal,
        criticalTasksCompleted: taskAnalysis.criticalTasksCompleted
      },
      teamHealth: taskAnalysis.teamHealth,
      memberProgress: taskAnalysis.memberWorkloads,
      alerts,
      marketplaceActivity: marketplaceAnalysis.activitySummary,
      timeline: sortedTimeline,
      readinessScores: {
        judge: Math.min(100, judgeScore),
        deployment: Math.min(100, deploymentScore),
        demo: Math.min(100, demoScore),
        testing: Math.min(100, testingScore)
      },
      gitHubAnalysis,
      executiveReport,
      highestPriorityFeature: featuresAnalysis.highestPriorityFeature,
      productivityTrend: taskAnalysis.productivityTrend,
      burndownVelocity: taskAnalysis.burndownVelocity
    };

    cache[projectId] = {
      timestamp: now,
      data
    };

    return data;
  }

  // Clear cache for a specific project on events
  clearCache(projectId) {
    if (cache[projectId]) {
      console.log(`[DecisionEngine] Cleared cache for project: ${projectId}`);
      delete cache[projectId];
    }
  }
}

module.exports = new DecisionEngine();
