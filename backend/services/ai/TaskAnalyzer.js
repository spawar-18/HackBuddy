/**
 * TaskAnalyzer
 * Analyzes tasks, workloads, critical paths, dependencies, and velocities.
 */
class TaskAnalyzer {
  analyze(project) {
    if (!project || !project.taskPlan) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        blockedTasks: 0,
        criticalTasksTotal: 0,
        criticalTasksCompleted: 0,
        completionPercentage: 0,
        memberWorkloads: [],
        burndownVelocity: 0,
        productivityTrend: 'Stable',
        teamHealth: 'Balanced',
        criticalDependenciesBlocked: false
      };
    }

    const assignments = project.taskPlan.assignments || [];
    const criticalTasks = new Set(project.taskPlan.criticalTasks || []);

    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;
    let blockedTasks = 0;
    let criticalTasksTotal = 0;
    let criticalTasksCompleted = 0;
    let criticalDependenciesBlocked = false;

    const memberWorkloads = [];
    const taskDates = [];

    assignments.forEach(assign => {
      const mName = assign.member;
      let mTotal = 0;
      let mCompleted = 0;
      let mPending = 0;
      let mBlocked = 0;

      (assign.assignedTasks || []).forEach(t => {
        totalTasks++;
        mTotal++;

        const isCritical = criticalTasks.has(t.task);
        if (isCritical) {
          criticalTasksTotal++;
        }

        if (t.status === 'Completed') {
          completedTasks++;
          mCompleted++;
          if (isCritical) {
            criticalTasksCompleted++;
          }
          if (t.updatedAt) {
            taskDates.push(new Date(t.updatedAt));
          }
        } else if (t.status === 'In Progress') {
          inProgressTasks++;
          mPending++;
        } else if (t.status === 'Blocked') {
          blockedTasks++;
          mBlocked++;
          mPending++;
          if (isCritical) {
            criticalDependenciesBlocked = true;
          }
        } else {
          pendingTasks++;
          mPending++;
        }
      });

      memberWorkloads.push({
        member: mName,
        total: mTotal,
        completed: mCompleted,
        pending: mPending,
        blocked: mBlocked
      });
    });

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Check workload balances
    let teamHealth = 'Balanced';
    if (memberWorkloads.length > 0) {
      const pendings = memberWorkloads.map(w => w.pending);
      const maxPending = Math.max(...pendings);
      const minPending = Math.min(...pendings);
      if (maxPending - minPending > 4) {
        teamHealth = 'High Risk';
      } else if (maxPending - minPending > 2) {
        teamHealth = 'Moderately Balanced';
      }
    }

    // Compute productivity trends & burndown velocity (tasks completed in last 4 hours)
    let productivityTrend = 'Stable';
    let burndownVelocity = 0;
    if (taskDates.length > 0) {
      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const recentCompletions = taskDates.filter(d => d >= fourHoursAgo).length;
      burndownVelocity = parseFloat((recentCompletions / 4).toFixed(1)); // tasks per hour

      const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      const completionsPrior = taskDates.filter(d => d >= eightHoursAgo && d < fourHoursAgo).length;

      if (recentCompletions > completionsPrior) {
        productivityTrend = 'Rising';
      } else if (recentCompletions < completionsPrior && completionsPrior > 0) {
        productivityTrend = 'Declining';
      }
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      blockedTasks,
      criticalTasksTotal,
      criticalTasksCompleted,
      completionPercentage,
      memberWorkloads,
      burndownVelocity,
      productivityTrend,
      teamHealth,
      criticalDependenciesBlocked
    };
  }
}

module.exports = new TaskAnalyzer();
