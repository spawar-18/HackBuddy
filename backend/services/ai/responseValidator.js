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
          'reasoning', 'judgePerspective', 'executionStrategy', 'executiveSummary',
          'innovation', 'architecture', 'security', 'performance', 'scalability',
          'database', 'deployment', 'ui', 'aiUsage', 'judgeScore', 'riskAnalysis',
          'strengths', 'weaknesses', 'recommendations', 'presentationTips',
          'investmentReadiness', 'hackathonWinningProbability', 'charts'
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
          executionPlan: [],
          judgeTips: [],
          roadmap: [],
          problemSolutionAlignment: '',
          projectRisks: [],
          mustBuildFeatures: [],
          optionalFeatures: [],
          featuresToRemove: [],
          improvementSuggestions: [],
          reasoning: '',
          judgePerspective: '',
          executionStrategy: [],
          executiveSummary: '',
          innovation: { score: 60, summary: '', recommendations: [] },
          architecture: { score: 60, summary: '', recommendations: [] },
          security: { score: 60, summary: '', risks: [], recommendations: [] },
          performance: { score: 60, summary: '', recommendations: [] },
          scalability: { score: 60, summary: '', recommendations: [] },
          database: { score: 60, summary: '', recommendations: [] },
          deployment: { score: 60, summary: '', recommendations: [] },
          ui: { score: 60, summary: '', recommendations: [] },
          aiUsage: { score: 60, summary: '', recommendations: [] },
          judgeScore: 60,
          riskAnalysis: [],
          recommendations: [],
          presentationTips: [],
          investmentReadiness: { score: 50, summary: '', blockers: [] },
          hackathonWinningProbability: 50,
          charts: {
            radar: [],
            gauges: [],
            timeline: []
          }
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
          warnings: [],
          milestones: [],
          deliverables: [],
          criticalPath: [],
          dependencies: [],
          epics: [],
          dependencyGraph: { nodes: [], edges: [] },
          marketplace: { requests: [], history: [], activityLog: [], recommendations: [] },
          executionMetrics: {}
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
          finalRecommendation: '',
          advantages: [],
          disadvantages: [],
          ecosystem: '',
          learningCurve: '',
          community: '',
          maintenance: '',
          performance: '',
          aiCompatibility: '',
          futureScalability: '',
          alternatives: [],
          negotiationSuggestions: [],
          confidence: 50
        }
      },
      analyzeHackathonCommandCenter: {
        required: [
          'overallStatus', 'riskLevel', 'completionPrediction', 'currentFocus',
          'tasksToPostpone', 'reasoning', 'judgePreparationTips', 'executionStrategy',
          'alerts', 'predictions', 'focusAreas', 'scopeReductionSuggestions',
          'riskScore', 'completionProbability'
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
          predictions: [],
          focusAreas: [],
          scopeReductionSuggestions: [],
          riskScore: 50,
          completionProbability: 50,
          dynamicScopeCutSuggestions: [],
          nextBestTask: { task: '', assignedTo: '', reason: '' },
          productivityTrend: 'Stable',
          burndownVelocity: 0,
          readinessScores: { judge: 50, deployment: 50, demo: 50, testing: 50 },
          timeline: [],
          executiveReport: {
            executiveSummary: '',
            projectOverview: '',
            featureAnalysis: '',
            taskAnalysis: '',
            teamAnalysis: '',
            gitHubIntelligence: '',
            marketplaceActivity: '',
            collaborationAnalysis: '',
            riskAssessment: '',
            productivityAnalysis: '',
            timelineAnalysis: '',
            deploymentReadiness: '',
            testingReadiness: '',
            judgeReadiness: '',
            overallProjectHealth: '',
            completionForecast: '',
            recommendations: []
          }
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
          heatmap: [],
          commits: [],
          contributors: [],
          issues: [],
          branches: [],
          pullRequests: [],
          repositoryHealthScore: 50,
          codeQuality: 'Unknown',
          velocity: 'Unknown',
          contributionHeatmap: [],
          aiSuggestions: []
        }
      },
      chatWithMentor: {
        required: ['answer', 'confidence', 'recommendations', 'memoryUpdates'],
        defaults: {
          answer: 'I am sorry, I encountered an issue generating a response.',
          confidence: 50,
          recommendations: [],
          followUpActions: [],
          relatedTasks: [],
          memoryUpdates: {}
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
      },
      extractMentorMemory: {
        required: ['architectureDecisions', 'techStackDecisions', 'projectMilestones', 'previousAiAdvice'],
        defaults: {
          architectureDecisions: [],
          techStackDecisions: [],
          projectMilestones: [],
          previousAiAdvice: [],
          currentBlockers: [],
          completedTasks: [],
          recentRecommendations: [],
          currentSprint: '',
          hackathonStage: '',
          githubStatus: ''
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
    try {
      return this.validateOrThrow(text, moduleName);
    } catch (err) {
      const schema = this.schemas[moduleName];
      if (!schema) return text;
      console.warn(`[ResponseValidator] Failed to parse/validate for ${moduleName}: ${err.message}. Returning default state.`);
      if (moduleName === 'chatWithMentor') return schema.defaults.answer;
      return schema.defaults;
    }
  }

  validateOrThrow(text, moduleName) {
    if (!text || (typeof text === 'string' && text.trim().length === 0)) {
      throw new Error('Empty AI response');
    }

    const schema = this.schemas[moduleName];
    if (!schema) {
      // If no schema defined, try to parse JSON anyway or return text
      try {
        return JSONRepairService.repairAndParse(text);
      } catch (e) {
        if (typeof text === 'string' && text.trim().length > 0) return text;
        throw new Error('Empty unstructured response');
      }
    }

    const parsed = typeof text === 'string' ? JSONRepairService.repairAndParse(text) : text;
    return this.normalizeObject(parsed, moduleName, { strict: true });
  }

  normalizeObject(parsed, moduleName, { strict = false } = {}) {
    const schema = this.schemas[moduleName];
    if (!schema) return parsed;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Invalid ${moduleName} response: expected JSON object`);
    }

    const allowedKeys = new Set(Object.keys(schema.defaults));
    const hallucinatedKeys = Object.keys(parsed).filter(key => !allowedKeys.has(key));
    if (strict && hallucinatedKeys.length > 0) {
      throw new Error(`Response contains unsupported keys: ${hallucinatedKeys.join(', ')}`);
    }

    const missingKeys = schema.required.filter(key => parsed[key] === undefined || parsed[key] === null || parsed[key] === '');
    if (strict && missingKeys.length > 0) {
      throw new Error(`Response missing required keys: ${missingKeys.join(', ')}`);
    }

    const normalized = { ...schema.defaults };

    Object.keys(schema.defaults).forEach(key => {
      if (parsed[key] !== undefined && parsed[key] !== null) {
        if (Array.isArray(schema.defaults[key])) {
          normalized[key] = Array.isArray(parsed[key]) ? parsed[key] : [parsed[key]];
        } else if (typeof schema.defaults[key] === 'object') {
          normalized[key] = (typeof parsed[key] === 'object' && !Array.isArray(parsed[key]))
            ? { ...schema.defaults[key], ...parsed[key] }
            : schema.defaults[key];
        } else {
          normalized[key] = parsed[key];
        }
      }
    });

    return normalized;
  }

  normalizeMentorResponse(result) {
    const schema = this.schemas.chatWithMentor;
    if (typeof result === 'string') {
      return {
        answer: result,
        confidence: schema.defaults.confidence,
        recommendations: [],
        followUpActions: [],
        relatedTasks: []
      };
    }

    if (typeof result === 'object' && result !== null) {
      return {
        answer: result.answer || schema.defaults.answer,
        confidence: result.confidence ?? schema.defaults.confidence,
        recommendations: result.recommendations || [],
        followUpActions: result.followUpActions || [],
        relatedTasks: result.relatedTasks || []
      };
    }

    return {
      answer: schema.defaults.answer,
      confidence: schema.defaults.confidence,
      recommendations: [],
      followUpActions: [],
      relatedTasks: []
    };
  }
}

module.exports = new ResponseValidator();
