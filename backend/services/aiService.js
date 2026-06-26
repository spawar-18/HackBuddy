const Project = require('../models/Project');
const Team = require('../models/Team');
const AIEngine = require('./ai/AIEngine');

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
      return {
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
  console.log('[aiService] Routing team readiness analysis to AIEngine...');
  const resolved = await resolveCentralContext(teamDataString, 'team');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'analyzeTeam',
    userInput: teamDataString
  });
};

/**
 * 2. Redesigned AI Project Review.
 */
const analyzeProjectWithAI = async (projectContextString) => {
  console.log('[aiService] Routing Project Review analysis to AIEngine...');
  const resolved = await resolveCentralContext(projectContextString, 'project');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'analyzeProject',
    userInput: projectContextString
  });
};

/**
 * 3. Redesigned AI Mentor Chat.
 */
const chatWithMentorAI = async (projectContextString, history, currentQuestion) => {
  console.log('[aiService] Routing Mentor Chat query to AIEngine...');
  const resolved = await resolveCentralContext(projectContextString, 'project');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'chatWithMentor',
    userInput: currentQuestion,
    history
  });
};

/**
 * 4. AI Task Splitter.
 */
const generateTaskPlanWithAI = async (contextString, members) => {
  console.log('[aiService] Routing task plan breakdown to AIEngine...');
  const resolved = await resolveCentralContext(contextString, 'taskplan');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'generateTaskPlan',
    userInput: contextString,
    members
  });
};

/**
 * 5. Marketplace Recommendation.
 */
const getMarketplaceRecommendation = async (requestDetails) => {
  console.log('[aiService] Routing Marketplace evaluation to AIEngine...');
  const resolved = await resolveCentralContext(requestDetails, 'marketplace');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'getMarketplaceRecommendation',
    userInput: requestDetails
  });
};

/**
 * 6. Tech Stack Consensus Engine.
 */
const analyzeTechStackWithAI = async (proposalContext, teamContext, hackathonDuration, projectComplexity) => {
  console.log('[aiService] Routing Tech Stack consensus review to AIEngine...');
  const resolved = await resolveCentralContext(proposalContext, 'techstack');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'analyzeTechStack',
    userInput: {
      proposal: proposalContext.proposal,
      votes: proposalContext.votes,
      members: proposalContext.members,
      teamContext,
      hackathonDuration,
      projectComplexity
    }
  });
};

/**
 * 7. AI Command Center.
 */
const analyzeHackathonCommandCenterWithAI = async (context) => {
  console.log('[aiService] Routing Command Center analytics to AIEngine...');
  const resolved = await resolveCentralContext(context, 'commandcenter');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'analyzeHackathonCommandCenter',
    userInput: context
  });
};

/**
 * 8. GitHub Intelligence.
 */
const analyzeGitHubRepositoryWithAI = async (context) => {
  console.log('[aiService] Routing GitHub Repository scan to AIEngine...');
  const resolved = await resolveCentralContext(context, 'github');
  return AIEngine.executeAI({
    projectId: resolved?.project?._id,
    module: 'analyzeGitHubRepository',
    userInput: context
  });
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
