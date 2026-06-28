/**
 * FeatureAnalyzer
 * Groups tasks by feature and computes completion percentages, health, and status.
 */
class FeatureAnalyzer {
  analyze(project) {
    if (!project) return { features: [], highestPriorityFeature: 'None', overallCompletion: 0 };

    const featuresToBuild = project.featuresToBuild || [];
    const assignments = project.taskPlan?.assignments || [];

    const featureTasksMap = {};
    featuresToBuild.forEach(f => {
      featureTasksMap[f] = [];
    });

    assignments.forEach(assign => {
      (assign.assignedTasks || []).forEach(task => {
        const feature = task.featureName || task.epic || 'General';
        if (!featureTasksMap[feature]) {
          featureTasksMap[feature] = [];
        }
        featureTasksMap[feature].push(task);
      });
    });

    const features = Object.entries(featureTasksMap).map(([name, tasks]) => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'Completed').length;
      const blocked = tasks.filter(t => t.status === 'Blocked').length;
      const inProgress = tasks.filter(t => t.status === 'In Progress').length;
      
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      let status = 'Not Started';
      if (completionPercentage === 100) status = 'Ready';
      else if (blocked > 0) status = 'Risk';
      else if (inProgress > 0 || completed > 0) status = 'In Progress';

      return {
        name,
        totalTasks: total,
        completedTasks: completed,
        blockedTasks: blocked,
        completionPercentage,
        status
      };
    });

    // Find highest priority features (often critical backend/database/auth tasks)
    let highestPriorityFeature = 'None';
    const criticalTasks = project.taskPlan?.criticalTasks || [];
    if (criticalTasks.length > 0) {
      // Find feature linked to critical tasks
      const featureWeight = {};
      assignments.forEach(assign => {
        (assign.assignedTasks || []).forEach(task => {
          if (criticalTasks.includes(task.task)) {
            const fName = task.featureName || task.epic || 'General';
            featureWeight[fName] = (featureWeight[fName] || 0) + 1;
          }
        });
      });
      const entries = Object.entries(featureWeight);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        highestPriorityFeature = entries[0][0];
      }
    }
    if (highestPriorityFeature === 'None' && featuresToBuild.length > 0) {
      highestPriorityFeature = featuresToBuild[0];
    }

    return {
      features,
      highestPriorityFeature
    };
  }
}

module.exports = new FeatureAnalyzer();
