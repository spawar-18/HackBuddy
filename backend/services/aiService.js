const Project = require('../models/Project');
const Team = require('../models/Team');

const geminiService = require('./ai/geminiService');
const aiContextBuilder = require('./ai/aiContextBuilder');
const promptBuilder = require('./ai/promptBuilder');
const memoryService = require('./ai/memoryService');
const responseValidator = require('./ai/responseValidator');
const responseFormatter = require('./ai/responseFormatter');
const mockFallbacks = require('./ai/mockFallbacks');

/**
 * Helper to dynamically resolve and load the unified central project context.
 * Falls back to null if the database lookup fails or project is not registered yet.
 */
const resolveCentralContext = async (input, type) => {
  try {
    let project = null;

    if (type === 'team' && typeof input === 'string') {
      const match = input.match(/Team Name:\s*(.*)/i);
      if (match) {
        const teamName = match[1].trim();
        const team = await Team.findOne({ teamName });
        if (team) {
          project = await Project.findOne({ teamId: team._id });
        }
      }
    } else if (type === 'project' && typeof input === 'string') {
      const match = input.match(/Project Name:\s*(.*)/i);
      if (match) {
        const projectName = match[1].trim();
        project = await Project.findOne({ projectName });
      }
    } else if (type === 'taskplan' && typeof input === 'string') {
      const match = input.match(/Project Name:\s*(.*)/i);
      if (match) {
        const projectName = match[1].trim();
        project = await Project.findOne({ projectName });
      }
    } else if (type === 'marketplace' && typeof input === 'object') {
      if (input.projectId) {
        project = await Project.findById(input.projectId);
      }
      if (!project && input.task) {
        project = await Project.findOne({
          'taskPlan.assignments.assignedTasks.task': input.task
        });
      }
    } else if (type === 'techstack' && typeof input === 'object') {
      if (input.proposal && input.proposal.projectId) {
        project = await Project.findById(input.proposal.projectId);
      }
      if (!project && input.proposal && input.proposal.projectName) {
        project = await Project.findOne({ projectName: input.proposal.projectName });
      }
    } else if ((type === 'commandcenter' || type === 'github') && typeof input === 'object') {
      if (input.projectId) {
        project = await Project.findById(input.projectId);
      }
      if (!project && input.projectDetails && input.projectDetails.projectName) {
        project = await Project.findOne({ projectName: input.projectDetails.projectName });
      }
    }

    if (project) {
      // Return the compiled context string from database
      return {
        contextString: await aiContextBuilder.buildContext(project._id),
        project
      };
    }
  } catch (err) {
    console.warn(`[AIContextResolver] Could not resolve central context for type ${type}:`, err.message);
  }

  return null;
};

/**
 * 1. Analyzes team readiness and recommendation roles.
 */
const analyzeTeamWithAI = async (teamDataString) => {
  try {
    console.log('[aiService] Running Gemini team readiness analysis...');
    const resolved = await resolveCentralContext(teamDataString, 'team');
    
    // Combine raw team data with central context if resolved, to enrich analysis
    const contextText = resolved 
      ? `${resolved.contextString}\n\nRaw Team Data:\n${teamDataString}` 
      : teamDataString;

    const payload = promptBuilder.buildTeamAnalysisPrompt(contextText);
    const rawResult = await geminiService.executePrompt({
      ...payload,
      isJson: true,
      schemaName: 'analyzeTeam',
      endpointName: 'analyzeTeam'
    });

    const parsed = responseValidator.validateAndParseJson(
      rawResult,
      ['readinessScore', 'strengths', 'skillGaps', 'recommendedRoles'],
      { readinessScore: 5.0, strengths: [], skillGaps: [], recommendedRoles: [] }
    );

    return responseFormatter.formatTeamAnalysis(parsed);
  } catch (err) {
    console.error('[aiService] analyzeTeamWithAI error, falling back to mock:', err.message);
    return mockFallbacks.generateMockAnalysis(teamDataString);
  }
};

/**
 * 2. Redesigned AI Project Review.
 */
const analyzeProjectWithAI = async (projectContextString) => {
  try {
    console.log('[aiService] Running Gemini Project Review analysis...');
    const resolved = await resolveCentralContext(projectContextString, 'project');
    
    const contextText = resolved ? resolved.contextString : projectContextString;
    const previousReview = resolved?.project?.projectReview || null;

    const payload = promptBuilder.buildProjectReviewPrompt(contextText, previousReview);
    const rawResult = await geminiService.executePrompt({
      ...payload,
      isJson: true,
      schemaName: 'analyzeProject',
      endpointName: 'analyzeProject'
    });

    const parsed = responseValidator.validateAndParseJson(
      rawResult,
      [
        'feasibilityScore', 'problemSolutionAlignment', 'projectRisks', 'missingSkills',
        'mustBuildFeatures', 'optionalFeatures', 'featuresToRemove', 'improvementSuggestions',
        'reasoning', 'judgePerspective', 'executionStrategy'
      ],
      {
        feasibilityScore: 5.0,
        problemSolutionAlignment: '',
        projectRisks: [],
        missingSkills: [],
        mustBuildFeatures: [],
        optionalFeatures: [],
        featuresToRemove: [],
        improvementSuggestions: [],
        reasoning: '',
        judgePerspective: '',
        executionStrategy: []
      }
    );

    return responseFormatter.formatProjectReview(parsed);
  } catch (err) {
    console.error('[aiService] analyzeProjectWithAI error, falling back to mock:', err.message);
    return mockFallbacks.generateMockProjectReview(projectContextString);
  }
};

/**
 * 3. Redesigned AI Mentor Chat.
 */
const chatWithMentorAI = async (projectContextString, history, currentQuestion) => {
  // Capture project instance if resolved, so we can save chat memory in the background
  let resolvedProject = null;
  try {
    console.log('[aiService] Running Gemini Mentor Chat query...');
    const resolved = await resolveCentralContext(projectContextString, 'project');
    
    const contextText = resolved ? resolved.contextString : projectContextString;
    let memory = null;

    if (resolved?.project) {
      resolvedProject = resolved.project;
      memory = await memoryService.getMemory(resolvedProject._id);
    }

    const payload = promptBuilder.buildMentorChatPrompt(contextText, history, currentQuestion, memory);
    const replyText = await geminiService.executePrompt({
      ...payload,
      endpointName: 'chatWithMentor'
    });

    // Extract memory and decisions in the background (asynchronous)
    if (resolvedProject && replyText) {
      memoryService.extractAndAddMemory(resolvedProject._id, currentQuestion, replyText)
        .catch(memErr => console.error('[aiService] Background memory extraction failed:', memErr.message));
    }

    return replyText;
  } catch (err) {
    console.error('[aiService] chatWithMentorAI error, falling back to mock:', err.message);
    return mockFallbacks.generateMockChatResponse(currentQuestion, projectContextString);
  }
};

/**
 * 4. AI Task Splitter.
 */
const generateTaskPlanWithAI = async (contextString, members) => {
  try {
    console.log('[aiService] Running Gemini task plan breakdown...');
    const resolved = await resolveCentralContext(contextString, 'taskplan');
    
    const contextText = resolved ? resolved.contextString : contextString;

    const payload = promptBuilder.buildTaskPlanPrompt(contextText, members);
    const rawResult = await geminiService.executePrompt({
      ...payload,
      isJson: true,
      schemaName: 'generateTaskPlan',
      endpointName: 'generateTaskPlan'
    });

    const parsed = responseValidator.validateAndParseJson(
      rawResult,
      [
        'projectTasks', 'assignments', 'workloadDistribution', 'executionOrder',
        'criticalTasks', 'recommendedFocus', 'warnings'
      ],
      {
        projectTasks: { coreFeatures: [], technicalTasks: [], deploymentTasks: [] },
        assignments: [],
        workloadDistribution: [],
        executionOrder: [],
        criticalTasks: [],
        recommendedFocus: [],
        warnings: []
      }
    );

    return responseFormatter.formatTaskPlan(parsed, members);
  } catch (err) {
    console.error('[aiService] generateTaskPlanWithAI error, falling back to mock:', err.message);
    return mockFallbacks.generateMockTaskPlan(contextString, members);
  }
};

/**
 * 5. Marketplace Recommendation.
 */
const getMarketplaceRecommendation = async (requestDetails) => {
  try {
    console.log('[aiService] Running Gemini Marketplace evaluation...');
    const resolved = await resolveCentralContext(requestDetails, 'marketplace');

    // If context resolved, append it to request details textually
    let promptInput = requestDetails;
    if (resolved) {
      promptInput = {
        ...requestDetails,
        centralProjectContext: resolved.contextString
      };
    }

    const payload = promptBuilder.buildMarketplacePrompt(promptInput);
    const rawResult = await geminiService.executePrompt({
      ...payload,
      isJson: true,
      schemaName: 'getMarketplaceRecommendation',
      endpointName: 'getMarketplaceRecommendation'
    });

    const parsed = responseValidator.validateAndParseJson(
      rawResult,
      ['recommendation', 'confidenceScore', 'reason'],
      { recommendation: 'Approve', confidenceScore: 80, reason: '' }
    );

    return responseFormatter.formatMarketplaceRecommendation(parsed);
  } catch (err) {
    console.error('[aiService] getMarketplaceRecommendation error, falling back to mock:', err.message);
    return mockFallbacks.generateMockMarketplaceRecommendation(requestDetails);
  }
};

/**
 * 6. Tech Stack Consensus Engine.
 */
const analyzeTechStackWithAI = async (proposalContext, teamContext, hackathonDuration, projectComplexity) => {
  try {
    console.log('[aiService] Running Gemini Tech Stack consensus review...');
    const resolved = await resolveCentralContext(proposalContext, 'techstack');

    // Enrich consensus input with centralized context if resolved
    let teamContextWithProjectDetails = teamContext;
    if (resolved) {
      teamContextWithProjectDetails += `\n\n[Central Project Context details]:\n${resolved.contextString}`;
    }

    const payload = promptBuilder.buildTechStackPrompt(
      proposalContext,
      teamContextWithProjectDetails,
      hackathonDuration,
      projectComplexity
    );
    const rawResult = await geminiService.executePrompt({
      ...payload,
      isJson: true,
      schemaName: 'analyzeTechStack',
      endpointName: 'analyzeTechStack'
    });

    const parsed = responseValidator.validateAndParseJson(
      rawResult,
      [
        'readinessScore', 'consensusScore', 'strengths', 'risks', 'recommendedChanges',
        'recommendedStack', 'reasoning', 'finalRecommendation'
      ],
      {
        readinessScore: 50,
        consensusScore: 50,
        strengths: [],
        risks: [],
        recommendedChanges: [],
        recommendedStack: { frontend: [], backend: [], database: [], ai: [], deployment: [] },
        reasoning: '',
        finalRecommendation: ''
      }
    );

    return responseFormatter.formatTechStackAnalysis(parsed);
  } catch (err) {
    console.error('[aiService] analyzeTechStackWithAI error, falling back to mock:', err.message);
    return mockFallbacks.generateMockTechStackAnalysis(
      proposalContext.proposal,
      proposalContext.votes,
      proposalContext.members
    );
  }
};

/**
 * 7. AI Command Center.
 */
const analyzeHackathonCommandCenterWithAI = async (context) => {
  try {
    console.log('[aiService] Running Gemini Command Center analytics...');
    const resolved = await resolveCentralContext(context, 'commandcenter');

    const combinedContext = resolved ? {
      ...context,
      centralContextString: resolved.contextString
    } : context;

    const payload = promptBuilder.buildCommandCenterPrompt(combinedContext);
    const rawResult = await geminiService.executePrompt({
      ...payload,
      isJson: true,
      schemaName: 'analyzeHackathonCommandCenter',
      endpointName: 'analyzeHackathonCommandCenter'
    });

    const parsed = responseValidator.validateAndParseJson(
      rawResult,
      [
        'overallStatus', 'riskLevel', 'completionPrediction', 'currentFocus',
        'tasksToPostpone', 'reasoning', 'judgePreparationTips', 'executionStrategy'
      ],
      {
        overallStatus: 'On Track',
        riskLevel: 'Medium',
        completionPrediction: 'Analysis inconclusive.',
        currentFocus: [],
        tasksToPostpone: [],
        reasoning: '',
        judgePreparationTips: [],
        executionStrategy: []
      }
    );

    return responseFormatter.formatCommandCenterReport(parsed);
  } catch (err) {
    console.error('[aiService] analyzeHackathonCommandCenterWithAI error, falling back to mock:', err.message);
    return mockFallbacks.generateMockCommandCenterReport(context);
  }
};

/**
 * 8. GitHub Intelligence.
 */
const analyzeGitHubRepositoryWithAI = async (context) => {
  try {
    console.log('[aiService] Running Gemini GitHub Repository scan...');
    const resolved = await resolveCentralContext(context, 'github');

    const combinedContext = resolved ? {
      ...context,
      centralContextString: resolved.contextString
    } : context;

    const payload = promptBuilder.buildGitHubRepoPrompt(combinedContext);
    const rawResult = await geminiService.executePrompt({
      ...payload,
      isJson: true,
      schemaName: 'analyzeGitHubRepository',
      endpointName: 'analyzeGitHubRepository'
    });

    const parsed = responseValidator.validateAndParseJson(
      rawResult,
      [
        'repositoryHealth', 'developmentStatus', 'documentationStatus', 'testingStatus',
        'deploymentStatus', 'inactiveMembers', 'missingComponents', 'repositoryWarnings',
        'recommendations', 'reasoning'
      ],
      {
        repositoryHealth: 'Healthy',
        developmentStatus: 'Active',
        documentationStatus: 'Good',
        testingStatus: 'No tests detected',
        deploymentStatus: 'Missing configuration',
        inactiveMembers: [],
        missingComponents: [],
        repositoryWarnings: [],
        recommendations: [],
        reasoning: ''
      }
    );

    return responseFormatter.formatGitHubRepoAnalysis(parsed);
  } catch (err) {
    console.error('[aiService] analyzeGitHubRepositoryWithAI error, falling back to mock:', err.message);
    return mockFallbacks.generateFallbackRepoAnalysis(context);
  }
};

module.exports = {
  analyzeTeamWithAI,
  analyzeProjectWithAI,
  chatWithMentorAI,
  generateTaskPlanWithAI,
  getMarketplaceRecommendation,
  analyzeTechStackWithAI,
  analyzeHackathonCommandCenterWithAI,
  analyzeGitHubRepositoryWithAI
};
