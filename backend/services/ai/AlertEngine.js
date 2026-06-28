/**
 * AlertEngine
 * Analyzes features, tasks, repo code progress, workloads, and timer to generate high-confidence explainable alerts.
 * Merges duplicate alerts automatically and clears resolved ones.
 */
class AlertEngine {
  generateAlerts({
    featuresAnalysis,
    taskAnalysis,
    gitHubAnalysis,
    marketplaceAnalysis,
    hoursRemaining,
    config
  }) {
    const rawAlerts = [];
    const now = new Date();

    // ── 1. TIMER & DEADLINE ALERTS ──────────────────────────────────────────
    if (config && config.status === 'Running') {
      if (hoursRemaining <= 2) {
        rawAlerts.push({
          title: 'Immediate Code Freeze & Demo Dry-run',
          severity: 'Critical',
          message: 'Hackathon timeline ends in less than 2 hours. Initiate absolute code freeze immediately.',
          category: 'Timeline',
          reason: 'Demo stability is critical during the final hours of the hackathon.',
          evidence: `${hoursRemaining.toFixed(1)} hours remaining on countdown.`,
          affectedFeature: 'All Core Features',
          affectedTeamMember: 'All Members',
          confidenceScore: 99,
          suggestedAction: 'Deploy staging build immediately. Test end-to-end user flows on live host.',
          expectedImpact: 'Prevent runtime demo failures and crash loops during judge presentation.',
          timestamp: now
        });
      } else if (hoursRemaining <= 6) {
        rawAlerts.push({
          title: 'Lock MVP Scope & Begin Staging Deployment',
          severity: 'Critical',
          message: 'Less than 6 hours remaining. Stop secondary feature developments.',
          category: 'Timeline',
          reason: 'Unfinished backend integrations or deployment conflicts often cause presentation crashes.',
          evidence: `${hoursRemaining.toFixed(1)} hours remaining on countdown.`,
          affectedFeature: 'Deployment & Staging',
          affectedTeamMember: 'All Members',
          confidenceScore: 95,
          suggestedAction: 'Freeze new code additions. Dedicate resources to deployment setup and validation.',
          expectedImpact: 'Identify host environment issues early to guarantee a working production link.',
          timestamp: now
        });
      } else if (hoursRemaining <= 12) {
        rawAlerts.push({
          title: 'Midpoint Feature Polish Recommendation',
          severity: 'Warning',
          message: 'Midpoint check-in. Review critical path integrations.',
          category: 'Timeline',
          reason: '12 hours remaining indicates that core feature state binding must start immediately.',
          evidence: `${hoursRemaining.toFixed(1)} hours remaining on countdown.`,
          affectedFeature: 'API Integration',
          affectedTeamMember: 'Tech Lead / Leader',
          confidenceScore: 90,
          suggestedAction: 'Link backend REST services with React frontend dashboards. Verify data binding.',
          expectedImpact: 'Unblocks frontend engineers to style and polish layout views.',
          timestamp: now
        });
      }
    }

    // ── 2. BLOCKED & CRITICAL PATH ALERTS ────────────────────────────────────
    // Blocked tasks
    const blockedTasksList = [];
    if (config?.projectId) {
      const assignments = config.taskPlan?.assignments || [];
      assignments.forEach(a => {
        (a.assignedTasks || []).forEach(t => {
          if (t.status === 'Blocked') {
            blockedTasksList.push(t);
          }
        });
      });
    }

    blockedTasksList.forEach(t => {
      rawAlerts.push({
        title: `Blocked Task: ${t.task}`,
        severity: 'Critical',
        message: `Task is currently marked as Blocked, stalling project progress.`,
        category: 'Task',
        reason: 'Missing API endpoint dependencies or database structures is holding back completion.',
        evidence: `Task "${t.task}" status is Blocked.`,
        affectedFeature: t.featureName || t.epic || 'Core MVP',
        affectedTeamMember: 'Assigned Engineer',
        confidenceScore: 92,
        suggestedAction: 'Initiate a collaborative assistance request in the Task Marketplace.',
        expectedImpact: 'Leverage available teammate bandwidth to resolve blocking requirements.',
        timestamp: now
      });
    });

    // Pending critical tasks near deadline
    if (hoursRemaining <= 12 && taskAnalysis.criticalTasksTotal > taskAnalysis.criticalTasksCompleted) {
      const pendingCritical = taskAnalysis.criticalTasksTotal - taskAnalysis.criticalTasksCompleted;
      rawAlerts.push({
        title: 'Critical Path Completion Risk',
        severity: 'Critical',
        message: `${pendingCritical} critical path tasks are still incomplete.`,
        category: 'Task',
        reason: 'Critical path tasks represent the absolute minimum functional requirements for the judge demo.',
        evidence: `${taskAnalysis.criticalTasksCompleted}/${taskAnalysis.criticalTasksTotal} critical tasks completed. ${hoursRemaining.toFixed(1)} hours remaining.`,
        affectedFeature: 'Core MVP',
        affectedTeamMember: 'Leader',
        confidenceScore: 94,
        suggestedAction: 'Reassign non-critical tasks to available members to support critical path completion.',
        expectedImpact: 'Guarantee a complete, demoable functional core within the remaining window.',
        timestamp: now
      });
    }

    // ── 3. WORKLOAD IMBALANCE ALERTS ──────────────────────────────────────────
    if (taskAnalysis.teamHealth === 'High Risk') {
      // Find overloaded member
      let overloaded = null;
      let maxPending = 0;
      taskAnalysis.memberWorkloads.forEach(w => {
        if (w.pending > maxPending) {
          maxPending = w.pending;
          overloaded = w.member;
        }
      });

      if (overloaded) {
        rawAlerts.push({
          title: 'Severe Workload Imbalance',
          severity: 'Warning',
          message: `${overloaded} is carrying an overloaded task load compared to teammates.`,
          category: 'Collaboration',
          reason: 'Inefficient task distribution results in development bottlenecks.',
          evidence: `${overloaded} has ${maxPending} pending tasks.`,
          affectedFeature: 'Workload Balance',
          affectedTeamMember: overloaded,
          confidenceScore: 88,
          suggestedAction: 'Utilize Task Marketplace swap or reassign features to balance work.',
          expectedImpact: 'Reduces bottlenecks and decreases overall sprint completion delay by 2-3 hours.',
          timestamp: now
        });
      }
    }

    // ── 4. GITHUB ANALYTICS INTEGRATION ALERTS ──────────────────────────────
    if (gitHubAnalysis.connected) {
      // Alert if there is code velocity discrepancy (active tasks but no commits)
      const inactiveDevs = [];
      taskAnalysis.memberWorkloads.forEach(w => {
        if (w.pending > 0) {
          const commits = gitHubAnalysis.developerStats.find(s => s.developer.toLowerCase().includes(w.member.toLowerCase()));
          if (!commits || commits.commitsCount === 0) {
            inactiveDevs.push(w.member);
          }
        }
      });

      inactiveDevs.forEach(dev => {
        rawAlerts.push({
          title: `Stalled Git Velocity: ${dev}`,
          severity: 'Warning',
          message: `${dev} has active assignments but no repository commits.`,
          category: 'Git',
          reason: 'Work might be delayed or developer is blocked by setting up environment configs.',
          evidence: `${dev} has tasks pending but 0 commits registered in repository.`,
          affectedFeature: 'Repository Integration',
          affectedTeamMember: dev,
          confidenceScore: 85,
          suggestedAction: 'Reach out to developer to check local setup or verify task state.',
          expectedImpact: 'Verify progress correctness and help resolve silent dev setup blocks.',
          timestamp: now
        });
      }
      );

      // Low Repository Health alert
      if (gitHubAnalysis.healthScore < 60) {
        rawAlerts.push({
          title: 'Low Repository Integration Health',
          severity: 'Warning',
          message: `The repository health is flagged at ${gitHubAnalysis.healthScore}%.`,
          category: 'Git',
          reason: 'Frequent warning indications, missing documentation (README), or missing tests decrease repo quality.',
          evidence: `Repository health score is ${gitHubAnalysis.healthScore}%.`,
          affectedFeature: 'Repository Health',
          affectedTeamMember: 'All Members',
          confidenceScore: 80,
          suggestedAction: 'Document main project flows in README and add simple unit test cases.',
          expectedImpact: 'Provide pitch judges with clear project layout and build indicators.',
          timestamp: now
        });
      }
    }

    // ── 5. MARKETPLACE ALERTS ───────────────────────────────────────────────
    if (marketplaceAnalysis.pendingCount > 0) {
      rawAlerts.push({
        title: 'Pending Marketplace Requests',
        severity: 'Recommendation',
        message: `There are ${marketplaceAnalysis.pendingCount} task marketplace requests waiting for approval.`,
        category: 'Collaboration',
        reason: 'Task reallocation requests must be approved by the Team Leader to update team task allocations.',
        evidence: `${marketplaceAnalysis.pendingCount} requests currently set to Pending.`,
        affectedFeature: 'Task Marketplace',
        affectedTeamMember: 'Team Leader',
        confidenceScore: 90,
        suggestedAction: 'Review requests under the "Pending Requests" console in the Marketplace.',
        expectedImpact: 'Unlock blocked team members to start working on newly claimed/swapped tasks.',
        timestamp: now
      });
    }

    // ── 6. DEDUPLICATE AND MERGE ALERTS ─────────────────────────────────────
    const mergedAlerts = [];
    const alertKeys = new Set();

    rawAlerts.forEach(alert => {
      const key = `${alert.title.toLowerCase().trim()}_${alert.affectedTeamMember.toLowerCase().trim()}`;
      if (!alertKeys.has(key)) {
        alertKeys.add(key);
        mergedAlerts.push(alert);
      } else {
        // Merge - update confidence score or append message details if needed
        const existing = mergedAlerts.find(a => `${a.title.toLowerCase().trim()}_${a.affectedTeamMember.toLowerCase().trim()}` === key);
        if (existing) {
          existing.confidenceScore = Math.min(100, Math.max(existing.confidenceScore, alert.confidenceScore) + 2);
        }
      }
    });

    return mergedAlerts;
  }
}

module.exports = new AlertEngine();
