const JSONRepairService = require('./JSONRepairService');

/**
 * ResponseValidator
 * Validates and normalizes provider responses against required fields.
 * Ensures no provider-specific formats leak to the frontend.
 */
class ResponseValidator {
  constructor() {
    this.schemas = {
      analyzeTeam: {
        required: ['readinessScore', 'strengths', 'skillGaps', 'recommendedRoles'],
        defaults: { readinessScore: 5.0, strengths: [], skillGaps: [], recommendedRoles: [] }
      },
      analyzeProject: {
        required: [
          'feasibilityScore', 'problemSolutionAlignment', 'projectRisks', 'missingSkills',
          'mustBuildFeatures', 'optionalFeatures', 'featuresToRemove', 'improvementSuggestions',
          'reasoning', 'judgePerspective', 'executionStrategy'
        ],
        defaults: {
          feasibilityScore: 5.0,
          architectureScore: 60.0,
          scalabilityScore: 60.0,
          innovationScore: 60.0,
          businessValueScore: 60.0,
          radarAnalysis: { architecture: 60, scalability: 60, completeness: 60, innovation: 60, businessValue: 60 },
          priorityMatrix: [],
          strengths: [],
          weaknesses: [],
          missingSkills: [],
          riskTimeline: [],
          featureCoverage: [],
          roadmap: [],
          problemSolutionAlignment: '',
          projectRisks: [],
          mustBuildFeatures: [],
          optionalFeatures: [],
          featuresToRemove: [],
          improvementSuggestions: [],
          reasoning: '',
          judgePerspective: '',
          executionStrategy: []
        }
      },
      generateTaskPlan: {
        required: [
          'projectTasks', 'assignments', 'workloadDistribution', 'executionOrder',
          'criticalTasks', 'recommendedFocus', 'warnings'
        ],
        defaults: {
          projectTasks: { coreFeatures: [], technicalTasks: [], deploymentTasks: [] },
          assignments: [],
          workloadDistribution: [],
          executionOrder: [],
          criticalTasks: [],
          recommendedFocus: [],
          warnings: []
        }
      },
      getMarketplaceRecommendation: {
        required: ['recommendation', 'confidenceScore', 'reason'],
        defaults: { recommendation: 'Approve', confidenceScore: 80, reason: '' }
      },
      analyzeTechStack: {
        required: [
          'readinessScore', 'consensusScore', 'strengths', 'risks', 'recommendedChanges',
          'recommendedStack', 'reasoning', 'finalRecommendation'
        ],
        defaults: {
          readinessScore: 50,
          consensusScore: 50,
          strengths: [],
          risks: [],
          recommendedChanges: [],
          recommendedStack: { frontend: [], backend: [], database: [], ai: [], deployment: [] },
          reasoning: '',
          finalRecommendation: ''
        }
      },
      analyzeHackathonCommandCenter: {
        required: [
          'overallStatus', 'riskLevel', 'completionPrediction', 'currentFocus',
          'tasksToPostpone', 'reasoning', 'judgePreparationTips', 'executionStrategy'
        ],
        defaults: {
          overallStatus: 'On Track',
          riskLevel: 'Medium',
          completionPrediction: 'Analysis incomplete.',
          currentFocus: [],
          tasksToPostpone: [],
          reasoning: '',
          judgePreparationTips: [],
          executionStrategy: [],
          winningProbability: 50,
          alerts: [],
          dynamicScopeCutSuggestions: [],
          productivityTrend: 'Stable',
          burndownVelocity: 0,
          readinessScores: { judge: 50, deployment: 50, demo: 50, testing: 50 }
        }
      },
      analyzeGitHubRepository: {
        required: [
          'repositoryHealth', 'developmentStatus', 'documentationStatus', 'testingStatus',
          'deploymentStatus', 'inactiveMembers', 'missingComponents', 'repositoryWarnings',
          'recommendations', 'reasoning'
        ],
        defaults: {
          repositoryHealth: 'Healthy',
          developmentStatus: 'Active',
          documentationStatus: 'Good',
          testingStatus: 'No tests detected',
          deploymentStatus: 'Missing configuration',
          inactiveMembers: [],
          missingComponents: [],
          repositoryWarnings: [],
          recommendations: [],
          reasoning: '',
          developerProductivity: [],
          codeComplexity: 'Medium',
          mergeRisk: 'Low',
          heatmap: []
        }
      },
      verifyTaskWithAI: {
        required: ['verificationStatus', 'confidence', 'matchedFiles', 'matchedCommits', 'reasoning', 'missingEvidence', 'recommendation'],
        defaults: {
          verificationStatus: 'Needs Manual Review',
          confidence: 50,
          matchedFiles: [],
          matchedCommits: [],
          reasoning: 'No validation logic succeeded.',
          missingEvidence: [],
          recommendation: 'Check that files are correctly added and commits are descriptive.'
        }
      },
      winningProbability: {
        required: ['winningProbability', 'keyDifferentiators', 'risksToResolve', 'suggestions'],
        defaults: {
          winningProbability: 50,
          keyDifferentiators: [],
          risksToResolve: [],
          suggestions: []
        }
      },
      extractSkills: {
        required: ['skills'],
        defaults: {
          skills: []
        }
      }
    };
  }

  /**
   * Validates, cleans, repairs, and normalizes AI response.
   * @param {string} text - Raw AI response
   * @param {string} moduleName - Module name
   * @returns {object|string} Normalized JSON object, or raw text if not JSON module
   */
  validateAndNormalize(text, moduleName) {
    // If the module is chatWithMentor, it expects raw markdown text, not JSON
    if (moduleName === 'chatWithMentor') {
      if (!text || typeof text !== 'string') return 'I am sorry, I encountered an issue generating a response.';
      return JSONRepairService.stripThinkTags(text);
    }

    const schema = this.schemas[moduleName];
    if (!schema) {
      // If no schema defined, try to parse JSON anyway or return text
      try {
        return JSONRepairService.repairAndParse(text);
      } catch (e) {
        return text;
      }
    }

    try {
      const parsed = JSONRepairService.repairAndParse(text);
      
      // Normalize: check required fields and fill defaults
      const normalized = { ...schema.defaults };
      
      Object.keys(schema.defaults).forEach(key => {
        if (parsed[key] !== undefined && parsed[key] !== null) {
          // Type matching (basic checks)
          if (Array.isArray(schema.defaults[key])) {
            normalized[key] = Array.isArray(parsed[key]) ? parsed[key] : [parsed[key]];
          } else if (typeof schema.defaults[key] === 'object') {
            normalized[key] = (typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) 
              ? { ...schema.defaults[key], ...parsed[key] } 
              : parsed[key];
          } else {
            normalized[key] = parsed[key];
          }
        }
      });

      return normalized;
    } catch (err) {
      console.warn(`[ResponseValidator] Failed to parse/validate for ${moduleName}: ${err.message}. Returning default state.`);
      return schema.defaults;
    }
  }
}

module.exports = new ResponseValidator();
