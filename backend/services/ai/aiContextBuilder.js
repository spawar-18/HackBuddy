const Project = require('../../models/Project');
const Team = require('../../models/Team');
const HackathonConfig = require('../../models/HackathonConfig');
const TaskMarketplaceRequest = require('../../models/TaskMarketplaceRequest');
const GitHubRepository = require('../../models/GitHubRepository');
const ConversationMemory = require('../../models/ConversationMemory');
const cacheService = require('./cacheService');

/**
 * AIContextBuilder
 * Builds a unified, complete project context representation for LLM prompts.
 * Leverages CacheService to cache the compiled context string, avoiding
 * redundant database lookups.
 */

/**
 * Calculates the time remaining in a human-readable format.
 */
const calculateTimeRemainingStr = (endTime) => {
  if (!endTime) return 'Not specified';
  const now = new Date();
  const diffMs = endTime - now;
  const timeRemainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
  
  if (timeRemainingSeconds <= 0) {
    return '0 hours left (Hackathon has ended)';
  }
  const hoursLeft = Math.floor(timeRemainingSeconds / 3600);
  const minutesLeft = Math.floor((timeRemainingSeconds % 3600) / 60);
  return hoursLeft > 0 ? `${hoursLeft} hours, ${minutesLeft} minutes left` : `${minutesLeft} minutes left`;
};

/**
 * Compiles project data, team skills, git status, timeline config, and memory into a single context string.
 */
const compileProjectContext = ({
  project,
  team,
  config,
  gitRepo,
  marketplaceRequests,
  memory
}) => {
  let context = '==================================================\n';
  context += 'CENTRAL PROJECT CONTEXT DATA SHEET\n';
  context += '==================================================\n\n';

  // 1. Core Project Metadata
  context += '--- 1. PROJECT METADATA ---\n';
  context += `Project Name: ${project.projectName || 'N/A'}\n`;
  context += `Track: ${project.track || 'N/A'}\n`;
  context += `Duration: ${project.duration || 'N/A'}\n`;
  context += `Status: ${project.status || 'Planning'}\n`;
  context += `Problem Statement: ${project.problemStatement || 'N/A'}\n`;
  context += `Project Description: ${project.description || 'N/A'}\n`;
  context += `Project Objectives: ${project.objectives ? project.objectives.join(', ') : 'N/A'}\n`;
  context += `Project Features to Build:\n`;
  if (project.featuresToBuild && project.featuresToBuild.length > 0) {
    project.featuresToBuild.forEach(f => {
      context += `  - ${f}\n`;
    });
  } else {
    context += `  (No features specified yet)\n`;
  }
  context += '\n';

  // 2. Selected Tech Stack
  context += '--- 2. SELECTED TECH STACK ---\n';
  const stack = project.finalTechStack || {};
  context += `Frontend: ${stack.frontend || 'Not finalized'}\n`;
  context += `Backend: ${stack.backend || 'Not finalized'}\n`;
  context += `Database: ${stack.database || 'Not finalized'}\n`;
  context += `AI Layer: ${stack.ai || 'Not finalized'}\n`;
  context += `Deployment: ${stack.deployment || 'Not finalized'}\n`;
  context += '\n';

  // 3. Team Profile
  context += '--- 3. TEAM MEMBERS & SKILLS ---\n';
  if (team && team.members && team.members.length > 0) {
    team.members.forEach(member => {
      const skillsStr = member.skills && member.skills.length > 0 ? member.skills.join(', ') : 'None listed';
      const roleStr = member.role || 'Member';
      context += `- ${member.name} (${roleStr}) | Skills: ${skillsStr}\n`;
    });
  } else {
    context += `No team members registered yet.\n`;
  }
  context += '\n';

  // 4. Project Review
  context += '--- 4. LATEST AI PROJECT REVIEW ---\n';
  if (project.projectReview) {
    const review = project.projectReview;
    context += `Feasibility Score: ${review.feasibilityScore}/10\n`;
    context += `Problem-Solution Alignment: ${review.problemSolutionAlignment || 'N/A'}\n`;
    context += `Project Risks:\n`;
    (review.projectRisks || []).forEach(r => { context += `  - ${r}\n`; });
    context += `Missing Skills:\n`;
    (review.missingSkills || []).forEach(s => { context += `  - ${s}\n`; });
    context += `Must Build Features (MVP):\n`;
    (review.mustBuildFeatures || []).forEach(f => { context += `  - ${f}\n`; });
    context += `Optional Features:\n`;
    (review.optionalFeatures || []).forEach(f => { context += `  - ${f}\n`; });
    context += `Features To Remove:\n`;
    (review.featuresToRemove || []).forEach(f => { context += `  - ${f}\n`; });
    context += `Improvement Suggestions:\n`;
    (review.improvementSuggestions || []).forEach(s => { context += `  - ${s}\n`; });
    context += `Judge Perspective: ${review.judgePerspective || 'N/A'}\n`;
    context += `Execution Strategy Milestone Timeline:\n`;
    (review.executionStrategy || []).forEach((step, idx) => {
      context += `  ${idx + 1}. ${step}\n`;
    });
  } else {
    context += `No AI Project Review has been generated yet.\n`;
  }
  context += '\n';

  // 5. Task Plan & Progress
  context += '--- 5. TASK SPLITTER & PROJECT PROGRESS ---\n';
  if (project.taskPlan && project.taskPlan.assignments) {
    const plan = project.taskPlan;
    context += `Critical Tasks:\n`;
    (plan.criticalTasks || []).forEach(t => { context += `  - ${t}\n`; });
    context += `Recommended Focus Areas:\n`;
    (plan.recommendedFocus || []).forEach(f => { context += `  - ${f}\n`; });
    context += `Task Warnings:\n`;
    (plan.warnings || []).forEach(w => { context += `  - ${w}\n`; });
    context += `Execution Order:\n`;
    (plan.executionOrder || []).forEach(step => { context += `  - ${step}\n`; });
    
    context += `Task Status & Resource Assignment:\n`;
    plan.assignments.forEach(a => {
      context += `  * Member: ${a.member} (Assigned tasks count: ${a.assignedTasks ? a.assignedTasks.length : 0})\n`;
      if (a.assignedTasks && a.assignedTasks.length > 0) {
        a.assignedTasks.forEach(task => {
          context += `    - [Status: ${task.status}] ${task.task} | Marketplace: ${task.marketplaceStatus || 'Locked'}\n`;
        });
      } else {
        context += `    - No tasks assigned.\n`;
      }
    });

    context += `Workload Balance Percentage:\n`;
    (plan.workloadDistribution || []).forEach(dist => {
      context += `  - ${dist.member}: ${dist.percentage}%\n`;
    });
  } else {
    context += `No task splitting plan exists yet.\n`;
  }
  context += '\n';

  // 6. Marketplace Requests
  context += '--- 6. TASK MARKETPLACE ACTIVITY ---\n';
  if (marketplaceRequests && marketplaceRequests.length > 0) {
    marketplaceRequests.forEach(req => {
      context += `- [${req.status}] ${req.requestType} for task: "${req.taskName || req.taskId}" requested by ${req.requestedBy || 'Unknown'}\n`;
    });
  } else {
    context += `No marketplace requests active.\n`;
  }
  context += '\n';

  // 7. Hackathon Configuration & Time Remaining
  context += '--- 7. HACKATHON SCHEDULE ---\n';
  if (config) {
    context += `Hackathon Name: ${config.hackathonName || 'N/A'}\n`;
    context += `Current Phase: ${config.status || 'N/A'}\n`;
    context += `Start Time: ${config.startTime ? config.startTime.toISOString() : 'N/A'}\n`;
    context += `End Time: ${config.endTime ? config.endTime.toISOString() : 'N/A'}\n`;
    context += `Code Freeze: ${config.codeFreezeTime ? config.codeFreezeTime.toISOString() : 'N/A'}\n`;
    context += `Time Remaining: ${calculateTimeRemainingStr(config.endTime)}\n`;
  } else {
    context += `Hackathon timing configuration is missing.\n`;
  }
  context += '\n';

  // 8. Command Center Status
  context += '--- 8. HACKATHON COMMAND CENTER REPORT ---\n';
  if (project.commandCenterReport) {
    const rpt = project.commandCenterReport;
    context += `Overall Status: ${rpt.overallStatus || 'N/A'}\n`;
    context += `Risk Level: ${rpt.riskLevel || 'N/A'}\n`;
    context += `Completion Prediction: ${rpt.completionPrediction || 'N/A'}\n`;
    context += `Current Focus:\n`;
    (rpt.currentFocus || []).forEach(f => { context += `  - ${f}\n`; });
    context += `Postponed Tasks:\n`;
    (rpt.tasksToPostpone || []).forEach(t => { context += `  - ${t}\n`; });
    context += `Reasoning Summary: ${rpt.reasoning || 'N/A'}\n`;
  } else {
    context += `No Command Center analytical report generated yet.\n`;
  }
  context += '\n';

  // 9. GitHub Repository Status
  context += '--- 9. GITHUB REPOSITORY STATUS & HEALTH ---\n';
  if (gitRepo) {
    context += `Repository Url: ${gitRepo.repositoryUrl || 'N/A'}\n`;
    context += `Default Branch: ${gitRepo.defaultBranch || 'main'}\n`;
    context += `Connection Status: ${gitRepo.connectionStatus || 'N/A'}\n`;
    context += `Repository Health Status: ${gitRepo.healthStatus || 'N/A'} (Score: ${gitRepo.healthScore}/100)\n`;
    
    if (gitRepo.cachedData) {
      const cache = gitRepo.cachedData;
      context += `Languages: ${JSON.stringify(cache.languages || {})}\n`;
      context += `Documentation Status: README present: ${cache.hasReadme || false}\n`;
      context += `Recent Commit History Summary:\n`;
      if (cache.commits && cache.commits.length > 0) {
        cache.commits.slice(0, 5).forEach(c => {
          context += `  - [${c.sha ? c.sha.substring(0, 7) : ''}] ${c.commit?.message || 'No msg'} by ${c.commit?.author?.name || 'Unknown'}\n`;
        });
      } else {
        context += `  - No commits synced.\n`;
      }
      context += `Pull Requests Status:\n`;
      if (cache.pullRequests && cache.pullRequests.length > 0) {
        cache.pullRequests.slice(0, 5).forEach(pr => {
          context += `  - [#${pr.number}] [State: ${pr.state}] ${pr.title}\n`;
        });
      } else {
        context += `  - No active PRs detected.\n`;
      }
      context += `Issues:\n`;
      if (cache.issues && cache.issues.length > 0) {
        cache.issues.slice(0, 5).forEach(iss => {
          context += `  - [#${iss.number}] [State: ${iss.state}] ${iss.title}\n`;
        });
      } else {
        context += `  - No active issues detected.\n`;
      }
    }
  } else {
    context += `No GitHub Repository is connected to this project.\n`;
  }
  context += '\n';

  // 10. AI Conversation Memory
  context += '--- 10. AI CONVERSATION MEMORY ---\n';
  if (memory) {
    context += `Memory Summary: ${memory.summary || 'None'}\n`;
    context += `Architecture Decisions:\n`;
    (memory.architectureDecisions || []).forEach(d => { context += `  - ${d}\n`; });
    context += `Tech Stack Decisions:\n`;
    (memory.techStackDecisions || []).forEach(d => { context += `  - ${d}\n`; });
    context += `Project Milestones:\n`;
    (memory.projectMilestones || []).forEach(m => { context += `  - ${m}\n`; });
    context += `Previous AI Advice:\n`;
    (memory.previousAiAdvice || []).forEach(a => { context += `  - ${a}\n`; });
  } else {
    context += `No conversation memory registered yet.\n`;
  }
  context += '\n';

  context += '==================================================\n';
  return context;
};

/**
 * Builds the complete project context automatically.
 * @param {string} projectId - The Project ID
 * @param {boolean} [bypassCache=false] - Force rebuild and re-cache
 * @returns {Promise<string>} Compiled context string
 */
const buildContext = async (projectId, bypassCache = false) => {
  if (!projectId) {
    throw new Error('Project ID is required to build AI project context.');
  }

  // 1. Check cache first
  if (!bypassCache) {
    const cached = cacheService.getContext(projectId);
    if (cached) {
      console.log(`[AIContextBuilder] Retrieved cached context for project ${projectId}`);
      return cached;
    }
  }

  console.log(`[AIContextBuilder] Compiling fresh context for project ${projectId}...`);

  // 2. Fetch all databases concurrently
  const [project, hackathonConfig, gitRepo, marketplaceRequests, memory] = await Promise.all([
    Project.findById(projectId),
    HackathonConfig.findOne({ projectId }),
    GitHubRepository.findOne({ projectId }),
    TaskMarketplaceRequest.find({ projectId }),
    ConversationMemory.findOne({ projectId })
  ]);

  if (!project) {
    throw new Error(`Project not found for ID: ${projectId}`);
  }

  // Fetch team details separately (to populate members correctly)
  const team = await Team.findById(project.teamId).populate('members', 'name skills role');

  // 3. Compile context string
  const contextString = compileProjectContext({
    project,
    team,
    config: hackathonConfig,
    gitRepo,
    marketplaceRequests,
    memory
  });

  // 4. Update cache
  cacheService.setContext(projectId, contextString);

  return contextString;
};

module.exports = {
  buildContext,
  calculateTimeRemainingStr
};
