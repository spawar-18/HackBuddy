/**
 * ReportEngine
 * Generates structured, explainable Executive Reports with deep data analysis.
 */
class ReportEngine {
  generateReport({
    project,
    featuresAnalysis,
    taskAnalysis,
    gitHubAnalysis,
    marketplaceAnalysis,
    hoursRemaining
  }) {
    const name = project.projectName || 'this project';
    const problem = project.problemStatement || 'unspecified challenge';
    const total = taskAnalysis.totalTasks;
    const completed = taskAnalysis.completedTasks;
    const pct = taskAnalysis.completionPercentage;
    const blocked = taskAnalysis.blockedTasks;
    const remaining = taskAnalysis.pendingTasks + taskAnalysis.inProgressTasks;
    const tech = project.finalTechStack || {};

    const stackDetails = [];
    if (tech.frontend) stackDetails.push(`Frontend: ${tech.frontend}`);
    if (tech.backend) stackDetails.push(`Backend: ${tech.backend}`);
    if (tech.database) stackDetails.push(`Database: ${tech.database}`);
    if (tech.ai) stackDetails.push(`AI: ${tech.ai}`);
    if (tech.deployment) stackDetails.push(`Deployment: ${tech.deployment}`);
    const stackStr = stackDetails.length > 0 ? stackDetails.join(', ') : 'Not finalized';

    // ── 1. Executive Summary ──
    const executiveSummary = `Executive report for project "${name}". The project is tackling: "${problem}". Currently, the team has completed ${completed} of ${total} total assigned tasks (${pct}% complete), with ${blocked} tasks blocked and ${remaining} remaining. Core tech stack consists of: ${stackStr}. Development is moving at ${taskAnalysis.burndownVelocity} tasks/hour with a "${taskAnalysis.productivityTrend}" velocity trend.`;

    // ── 2. Project Overview ──
    const projectOverview = `The project "${name}" is designed with a scope of ${featuresAnalysis.features.length} core features. Current dashboard metrics indicate an overall progress level of ${pct}%. With ${hoursRemaining.toFixed(1)} hours remaining until the deadline, the team must prioritize the critical path tasks.`;

    // ── 3. Feature Analysis ──
    const featureLines = featuresAnalysis.features.map(f =>
      `• Feature "${f.name}": ${f.completionPercentage}% complete (${f.completedTasks}/${f.totalTasks} tasks finished, status: ${f.status}).`
    );
    const featureAnalysis = `Detailed feature checklist breakdown:\n${featureLines.length > 0 ? featureLines.join('\n') : 'No features mapped to tasks yet.'}`;

    // ── 4. Task Analysis ──
    const taskAnalysisText = `Total task items registered: ${total}. Completed tasks: ${completed}. Tasks in-progress: ${taskAnalysis.inProgressTasks}. Blocked items: ${blocked}. Critical path tasks: ${taskAnalysis.criticalTasksTotal} total, ${taskAnalysis.criticalTasksCompleted} completed (${taskAnalysis.criticalTasksTotal - taskAnalysis.criticalTasksCompleted} remaining). Critical dependencies blocked status: ${taskAnalysis.criticalDependenciesBlocked ? 'RISK (critical dependencies currently blocked)' : 'None'}.`;

    // ── 5. Team Analysis ──
    const teamLines = taskAnalysis.memberWorkloads.map(w =>
      `• ${w.member}: ${w.completed}/${w.total} tasks completed, ${w.pending} pending (${w.blocked} blocked).`
    );
    const teamAnalysis = `Squad workload distribution review (status: ${taskAnalysis.teamHealth}):\n${teamLines.length > 0 ? teamLines.join('\n') : 'No team members mapped.'}`;

    // ── 6. GitHub Intelligence ──
    const gitHubIntelligence = gitHubAnalysis.connected
      ? `GitHub integration active. Health score: ${gitHubAnalysis.healthScore}%. Total commits recorded: ${gitHubAnalysis.commitsCount} across ${gitHubAnalysis.branchesCount} active branches. Pull requests: ${gitHubAnalysis.pullRequestsCount}. Open issues: ${gitHubAnalysis.issuesCount}.`
      : 'GitHub repository not connected. Hook repository to verify code commits and branch merges.';

    // ── 7. Marketplace Activity ──
    const marketplaceActivity = `Marketplace balance: ${marketplaceAnalysis.requestsCount} requests registered. Pending approvals: ${marketplaceAnalysis.pendingCount}. Active swaps: ${marketplaceAnalysis.activeSwaps}. Active collaboration/help helper tasks: ${marketplaceAnalysis.activeCollaborations}.`;

    // ── 8. Collaboration Analysis ──
    const collaborationAnalysis = marketplaceAnalysis.activeCollaborations > 0
      ? `There are currently ${marketplaceAnalysis.activeCollaborations} active collaboration/assistance request flows. Teammates are helping each other on blocked MVP components.`
      : 'No active collaborator requests. Squad communication is operating via direct channels or assignments are siloed.';

    // ── 9. Risk Assessment ──
    const risks = [];
    if (blocked > 0) risks.push(`• High Risk: ${blocked} tasks are blocked. Code cannot progress until blocking dependencies are resolved.`);
    if (taskAnalysis.criticalDependenciesBlocked) risks.push('• Critical Risk: Core MVP critical path tasks are blocked by pending database or auth issues.');
    if (taskAnalysis.teamHealth === 'High Risk') risks.push('• Medium Risk: Severely imbalanced workloads. Tasks are concentrated on a single developer.');
    if (hoursRemaining <= 6 && pct < 70) risks.push('• High Risk: Scope creep. Project is under 70% complete with less than 6 hours left.');
    if (!gitHubAnalysis.connected) risks.push('• Low Risk: Repository integration is missing. AI cannot verify commits.');

    const riskAssessment = risks.length > 0
      ? `Active risks identified from actual project state:\n${risks.join('\n')}`
      : 'No major risk factors detected. Project is executing cleanly.';

    // ── 10. Productivity Analysis ──
    const productivityAnalysis = `Velocity trend: ${taskAnalysis.productivityTrend}. Current task burndown rate: ${taskAnalysis.burndownVelocity} tasks/hour. Workload balance index is ${taskAnalysis.teamHealth === 'Balanced' ? 'Optimal' : 'Needs attention due to uneven assignments'}.`;

    // ── 11. Timeline Analysis ──
    const timelineAnalysis = `Hackathon time left: ${hoursRemaining.toFixed(1)} hours. Based on current burndown velocity (${taskAnalysis.burndownVelocity} tasks/hr), the team can complete approximately ${(taskAnalysis.burndownVelocity * hoursRemaining).toFixed(1)} tasks before code freeze. Remaining tasks to complete: ${remaining}.`;

    // ── 12. Deployment Readiness ──
    let deployPct = 0;
    if (tech.deployment) deployPct += 30;
    if (gitHubAnalysis.connected) deployPct += 20;
    if (completed > total * 0.5) deployPct += 30;
    if (pct === 100) deployPct = 100;
    const deploymentReadiness = `Deployment readiness score: ${deployPct}%. Current deployment stack: ${tech.deployment || 'Not configured'}. Staging builds should begin to test cloud bindings.`;

    // ── 13. Testing Readiness ──
    let testPct = 0;
    if (gitHubAnalysis.connected && gitHubAnalysis.healthScore > 70) testPct += 40;
    if (completed > total * 0.7) testPct += 40;
    if (completed === total) testPct = 100;
    const testingReadiness = `Testing readiness score: ${testPct}%. Unit test validation scripts should be added to branches before merging.`;

    // ── 14. Judge Readiness ──
    let judgePct = 0;
    if (pct > 50) judgePct += 30;
    if (pct > 80) judgePct += 30;
    if (gitHubAnalysis.connected) judgePct += 20;
    if (tech.frontend) judgePct += 20;
    const judgeReadiness = `Judge readiness score: ${judgePct}%. Focus on pitching the exact problem statement ("${problem.substring(0, 100)}...") and demonstrating a working core.`;

    // ── 15. Overall Project Health ──
    let healthLabel = 'Excellent';
    if (blocked > 0 || taskAnalysis.criticalDependenciesBlocked) healthLabel = 'Critical';
    else if (pct < 40 && hoursRemaining < 12) healthLabel = 'Needs Attention';
    else if (pct < 70) healthLabel = 'Healthy';
    const overallProjectHealth = `Overall Project Health Status: ${healthLabel}. Factors evaluated: task completion, blocked critical paths, Git velocity, and remaining time.`;

    // ── 16. Completion Forecast ──
    const completionForecast = remaining === 0
      ? 'Forecast: Project completed successfully. Prepare slides and pitching materials.'
      : remaining <= taskAnalysis.burndownVelocity * hoursRemaining
      ? `Forecast: HIGH PROBABILITY of completion. Remaining ${remaining} tasks fit within expected burndown envelope.`
      : `Forecast: SCOPE ADJUSTMENT REQUIRED. Remaining ${remaining} tasks exceed estimated burndown velocity. Trimming nice-to-have features is highly recommended.`;

    // ── 17. Recommendations ──
    const recommendations = [];
    if (blocked > 0) {
      recommendations.push('Resolve the blocked tasks immediately. Check for open help requests in the Marketplace.');
    }
    if (taskAnalysis.teamHealth === 'High Risk') {
      recommendations.push('Balance developer workloads by reallocating pending frontend tasks to free backend engineers.');
    }
    if (hoursRemaining <= 6 && remaining > 0) {
      recommendations.push('Freeze all feature additions. Focus on styling, deployment correctness, and pitch slides.');
    }
    if (!gitHubAnalysis.connected) {
      recommendations.push('Connect your GitHub repository in the Git tab to enable automated codebase checks.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Maintain current development velocity. Test the demo flows end-to-end.');
    }

    return {
      executiveSummary,
      projectOverview,
      featureAnalysis,
      taskAnalysis: taskAnalysisText,
      teamAnalysis,
      gitHubIntelligence,
      marketplaceActivity,
      collaborationAnalysis,
      riskAssessment,
      productivityAnalysis,
      timelineAnalysis,
      deploymentReadiness,
      testingReadiness,
      judgeReadiness,
      overallProjectHealth,
      completionForecast,
      recommendations
    };
  }
}

module.exports = new ReportEngine();
