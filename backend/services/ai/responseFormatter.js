/**
 * ResponseFormatter
 * Formats, cleans up, and normalizes parsed AI responses before they are returned.
 * Provides fallback values for missing attributes and ensures type consistency.
 */

/**
 * Normalizes Team Analysis JSON
 */
const formatTeamAnalysis = (data) => {
  const result = { ...data };
  
  if (typeof result.readinessScore !== 'number' || result.readinessScore < 1 || result.readinessScore > 10) {
    result.readinessScore = typeof result.readinessScore === 'number' ? Math.max(1, Math.min(10, result.readinessScore)) : 5.0;
  }
  
  if (!Array.isArray(result.strengths)) result.strengths = [];
  if (!Array.isArray(result.skillGaps)) result.skillGaps = [];
  if (!Array.isArray(result.recommendedRoles)) result.recommendedRoles = [];
  
  result.recommendedRoles = result.recommendedRoles.map(roleObj => ({
    member: roleObj.member || '',
    role: roleObj.role || ''
  }));

  return result;
};

/**
 * Normalizes Project Review JSON
 */
const formatProjectReview = (data) => {
  const result = { ...data };

  if (typeof result.feasibilityScore !== 'number') {
    result.feasibilityScore = 5.0;
  }
  
  if (typeof result.problemSolutionAlignment !== 'string') result.problemSolutionAlignment = '';
  if (!Array.isArray(result.projectRisks)) result.projectRisks = [];
  if (!Array.isArray(result.missingSkills)) result.missingSkills = [];
  if (!Array.isArray(result.mustBuildFeatures)) result.mustBuildFeatures = [];
  if (!Array.isArray(result.optionalFeatures)) result.optionalFeatures = [];
  if (!Array.isArray(result.featuresToRemove)) result.featuresToRemove = [];
  if (!Array.isArray(result.improvementSuggestions)) result.improvementSuggestions = [];
  if (typeof result.reasoning !== 'string') result.reasoning = '';
  if (typeof result.judgePerspective !== 'string') result.judgePerspective = '';
  if (!Array.isArray(result.executionStrategy)) result.executionStrategy = [];

  return result;
};

/**
 * Normalizes Task Plan JSON
 */
const formatTaskPlan = (data, members = []) => {
  const result = { ...data };

  if (!result.projectTasks || typeof result.projectTasks !== 'object') {
    result.projectTasks = { coreFeatures: [], technicalTasks: [], deploymentTasks: [] };
  } else {
    result.projectTasks.coreFeatures = Array.isArray(result.projectTasks.coreFeatures) ? result.projectTasks.coreFeatures : [];
    result.projectTasks.technicalTasks = Array.isArray(result.projectTasks.technicalTasks) ? result.projectTasks.technicalTasks : [];
    result.projectTasks.deploymentTasks = Array.isArray(result.projectTasks.deploymentTasks) ? result.projectTasks.deploymentTasks : [];
  }

  if (!Array.isArray(result.assignments)) result.assignments = [];
  if (!Array.isArray(result.workloadDistribution)) result.workloadDistribution = [];
  if (!Array.isArray(result.executionOrder)) result.executionOrder = [];
  if (!Array.isArray(result.criticalTasks)) result.criticalTasks = [];
  if (!Array.isArray(result.recommendedFocus)) result.recommendedFocus = [];
  if (!Array.isArray(result.warnings)) result.warnings = [];

  // Normalize assignments
  result.assignments = result.assignments.map(a => {
    let assignedTasks = [];
    if (Array.isArray(a.assignedTasks)) {
      assignedTasks = a.assignedTasks.map(t => {
        if (typeof t === 'string') {
          return { task: t, status: 'Not Started' };
        }
        return {
          task: t.task || String(t),
          status: t.status || 'Not Started',
          assignedTo: t.assignedTo || a.member || '',
          collaborators: Array.isArray(t.collaborators) ? t.collaborators : [],
          marketplaceStatus: t.marketplaceStatus || 'Locked',
          updatedAt: t.updatedAt || new Date()
        };
      });
    }
    
    return {
      member: a.member || '',
      skills: Array.isArray(a.skills) ? a.skills : [],
      assignedTasks,
      reason: a.reason || ''
    };
  });

  return result;
};

/**
 * Normalizes Marketplace Recommendation JSON
 */
const formatMarketplaceRecommendation = (data) => {
  const result = { ...data };

  if (!result.recommendation || (result.recommendation !== 'Approve' && result.recommendation !== 'Reject')) {
    result.recommendation = 'Approve';
  }
  if (typeof result.confidenceScore !== 'number') {
    result.confidenceScore = 80;
  }
  if (typeof result.reason !== 'string') {
    result.reason = '';
  }

  return result;
};

/**
 * Normalizes Tech Stack Consensus Analysis JSON
 */
const formatTechStackAnalysis = (data) => {
  const result = { ...data };

  if (typeof result.readinessScore !== 'number') result.readinessScore = 50;
  if (typeof result.consensusScore !== 'number') result.consensusScore = 50;
  if (!Array.isArray(result.strengths)) result.strengths = [];
  if (!Array.isArray(result.risks)) result.risks = [];
  if (!Array.isArray(result.recommendedChanges)) result.recommendedChanges = [];

  if (!result.recommendedStack || typeof result.recommendedStack !== 'object') {
    result.recommendedStack = { frontend: [], backend: [], database: [], ai: [], deployment: [] };
  } else {
    ['frontend', 'backend', 'database', 'ai', 'deployment'].forEach(key => {
      if (!Array.isArray(result.recommendedStack[key])) {
        result.recommendedStack[key] = result.recommendedStack[key] ? [String(result.recommendedStack[key])] : [];
      }
    });
  }

  if (typeof result.reasoning !== 'string') result.reasoning = '';
  if (typeof result.finalRecommendation !== 'string') result.finalRecommendation = '';

  return result;
};

/**
 * Normalizes Hackathon Command Center Analysis Report JSON
 */
const formatCommandCenterReport = (data) => {
  const result = { ...data };

  if (!result.overallStatus) result.overallStatus = 'On Track';
  if (!result.riskLevel) result.riskLevel = 'Medium';
  if (!result.completionPrediction) result.completionPrediction = 'Analysis inconclusive.';
  if (!Array.isArray(result.currentFocus)) result.currentFocus = [];
  if (!Array.isArray(result.tasksToPostpone)) result.tasksToPostpone = [];
  if (typeof result.reasoning !== 'string') result.reasoning = '';
  if (!Array.isArray(result.judgePreparationTips)) result.judgePreparationTips = [];
  if (!Array.isArray(result.executionStrategy)) result.executionStrategy = [];

  return result;
};

/**
 * Normalizes GitHub Repository Intelligence Report JSON
 */
const formatGitHubRepoAnalysis = (data) => {
  const result = { ...data };

  if (!result.repositoryHealth) result.repositoryHealth = 'Healthy';
  if (!result.developmentStatus) result.developmentStatus = 'Active';
  if (typeof result.documentationStatus !== 'string') result.documentationStatus = 'Good';
  if (typeof result.testingStatus !== 'string') result.testingStatus = 'No tests detected';
  if (typeof result.deploymentStatus !== 'string') result.deploymentStatus = 'Missing configuration';
  if (!Array.isArray(result.inactiveMembers)) result.inactiveMembers = [];
  if (!Array.isArray(result.missingComponents)) result.missingComponents = [];
  if (!Array.isArray(result.repositoryWarnings)) result.repositoryWarnings = [];
  if (!Array.isArray(result.recommendations)) result.recommendations = [];
  if (typeof result.reasoning !== 'string') result.reasoning = '';

  return result;
};

module.exports = {
  formatTeamAnalysis,
  formatProjectReview,
  formatTaskPlan,
  formatMarketplaceRecommendation,
  formatTechStackAnalysis,
  formatCommandCenterReport,
  formatGitHubRepoAnalysis
};
