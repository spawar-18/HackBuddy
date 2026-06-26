const promptVersionManager = require('./promptVersionManager');

/**
 * PromptBuilder
 * Constructs prompts, inputs, and formats for Google Gemini calls.
 * Ensures systemInstructions are loaded from promptVersionManager.
 */

/**
 * Builds the team analysis prompt.
 */
const buildTeamAnalysisPrompt = (teamDataString) => {
  return {
    contents: `Analyze this hackathon team and recommend roles.
    
Team data:
${teamDataString}`,
    systemInstruction: promptVersionManager.getInstruction('analyzeTeam'),
    promptVersion: promptVersionManager.getVersion('analyzeTeam')
  };
};

/**
 * Builds the project review prompt, preserving scores consistency if previous review is supplied.
 */
const buildProjectReviewPrompt = (projectContextString, previousReview = null) => {
  let promptText = `Please perform a detailed project review based on the following project context:\n\n`;
  promptText += `Project Context:\n${projectContextString}\n\n`;
  
  if (previousReview) {
    promptText += `==================================================\n`;
    promptText += `CRITICAL STABILITY RULES:\n`;
    promptText += `For consistency, we are providing the previous AI Project Review output below. Recommendations, feasibility scores, risks, and execution strategy should remain stable and only deviate if there is a significant, clear change in project features, team skills, or hackathon duration:\n`;
    promptText += `${JSON.stringify(previousReview, null, 2)}\n`;
    promptText += `==================================================\n`;
  }

  return {
    contents: promptText,
    systemInstruction: promptVersionManager.getInstruction('analyzeProject'),
    promptVersion: promptVersionManager.getVersion('analyzeProject')
  };
};

/**
 * Builds the chat mentor content payload (including history mapping).
 */
const buildMentorChatPrompt = (projectContextString, history, currentQuestion, conversationMemory = null) => {
  let systemInstruction = promptVersionManager.getInstruction('chatWithMentor');
  
  // Inject projectContextString into system instruction
  systemInstruction += `\n\n[CURRENT PROJECT CONTEXT DETAILS]:\n${projectContextString}`;

  if (conversationMemory) {
    systemInstruction += `\n\n[CONVERSATION MEMORY (KEY DECISIONS & SUMMARIES)]:\n`;
    systemInstruction += `Summary: ${conversationMemory.summary || 'None'}\n`;
    systemInstruction += `Architecture Decisions: ${(conversationMemory.architectureDecisions || []).join('; ') || 'None'}\n`;
    systemInstruction += `Tech Stack Decisions: ${(conversationMemory.techStackDecisions || []).join('; ') || 'None'}\n`;
    systemInstruction += `Milestones: ${(conversationMemory.projectMilestones || []).join('; ') || 'None'}\n`;
  }

  // Format history for Gemini SDK
  const contents = [];
  
  if (Array.isArray(history)) {
    history.forEach(h => {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.message }]
      });
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: currentQuestion }]
  });

  return {
    contents,
    systemInstruction,
    promptVersion: promptVersionManager.getVersion('chatWithMentor')
  };
};

/**
 * Builds the task plan generator prompt.
 */
const buildTaskPlanPrompt = (contextString, members) => {
  const memberList = members.map(m =>
    `- ${m.name}: ${(m.skills || []).join(', ') || 'No skills specified'}`
  ).join('\n');

  const promptText = `Analyze the project scope, technical tasks needed, and distribute workload:

Project Context:
${contextString}

Team Members and Skills:
${memberList}`;

  return {
    contents: promptText,
    systemInstruction: promptVersionManager.getInstruction('generateTaskPlan'),
    promptVersion: promptVersionManager.getVersion('generateTaskPlan')
  };
};

/**
 * Builds the marketplace recommendation prompt.
 */
const buildMarketplacePrompt = (requestDetails) => {
  const {
    task,
    requestType,
    requestedBy,
    targetUser = '',
    reason = '',
    teamSkills = {},
    currentWorkload = {},
    taskPriority = 'Medium',
    taskComplexity = 'Medium'
  } = requestDetails;

  const promptText = `Evaluate this Task Marketplace request:

Request Details:
- Request Type: ${requestType}
- Task in Question: "${task}"
- Requested By: ${requestedBy}
- Target Teammate: ${targetUser}
- Requester Reason: "${reason}"
- Task Priority: ${taskPriority}
- Task Complexity: ${taskComplexity}

Team Context:
- Skills & Profiles:
${JSON.stringify(teamSkills, null, 2)}
- Current Workload Distribution:
${JSON.stringify(currentWorkload, null, 2)}`;

  return {
    contents: promptText,
    systemInstruction: promptVersionManager.getInstruction('getMarketplaceRecommendation'),
    promptVersion: promptVersionManager.getVersion('getMarketplaceRecommendation')
  };
};

/**
 * Builds the tech stack consensus prompt.
 */
const buildTechStackPrompt = (proposalContext, teamContext, hackathonDuration, projectComplexity) => {
  const promptText = `Perform a detailed Tech Stack Consensus Analysis.

Inputs:
1. Proposed Tech Stack:
- Frontend: ${proposalContext.proposal.frontend}
- Backend: ${proposalContext.proposal.backend}
- Database: ${proposalContext.proposal.database}
- AI/ML: ${proposalContext.proposal.ai}
- Deployment: ${proposalContext.proposal.deployment}

2. Team Members & Skills:
${teamContext}

3. Team Votes, Confidence Scores & Concerns:
${JSON.stringify(proposalContext.votes, null, 2)}

4. Project Context:
- Hackathon Duration: ${hackathonDuration}
- Project Complexity: ${projectComplexity}`;

  return {
    contents: promptText,
    systemInstruction: promptVersionManager.getInstruction('analyzeTechStack'),
    promptVersion: promptVersionManager.getVersion('analyzeTechStack')
  };
};

/**
 * Builds the command center report prompt.
 */
const buildCommandCenterPrompt = (context) => {
  const { projectDetails, finalTechStack, teamSkills, taskPlan, timeRemaining, previousAlerts } = context;

  const assignments = taskPlan?.assignments || [];
  const totalTasks = assignments.reduce((sum, a) => sum + (a.assignedTasks?.length || 0), 0);
  const completedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Completed')?.length || 0), 0);
  const blockedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Blocked')?.length || 0), 0);
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const memberSummary = Object.entries(teamSkills || {})
    .map(([name, skills]) => `- ${name}: ${(skills || []).join(', ') || 'No skills listed'}`)
    .join('\n');

  const promptText = `Perform Hackathon Command Center Analysis.

Project: ${projectDetails?.projectName || 'Unknown'}
Problem: ${projectDetails?.problemStatement || 'N/A'}
Features: ${(projectDetails?.featuresToBuild || []).join(', ') || 'N/A'}
Tech Stack: ${JSON.stringify(finalTechStack || {})}
Time Remaining: ${timeRemaining}
Task Progress: ${completedTasks}/${totalTasks} completed (${pct}%), ${blockedTasks} blocked
Team Members & Skills:
${memberSummary}
Previous Alerts: ${(previousAlerts || []).join('; ') || 'None'}`;

  return {
    contents: promptText,
    systemInstruction: promptVersionManager.getInstruction('analyzeHackathonCommandCenter'),
    promptVersion: promptVersionManager.getVersion('analyzeHackathonCommandCenter')
  };
};

/**
 * Builds the github repo intelligence prompt.
 */
const buildGitHubRepoPrompt = (context) => {
  const {
    projectDetails,
    finalTechStack,
    taskPlan,
    timeRemaining,
    contributors,
    languages,
    hasReadme,
    hasTestFiles,
    hasDeployment,
    completedTasks,
    totalTasks,
    tree = [],
    readmeContent = '',
    packageJsonContent = '',
    entrypointCodeContents = []
  } = context;

  const formattedTree = tree
    .map(f => `- ${f.path} (${f.type === 'tree' ? 'Directory' : 'File'})`)
    .slice(0, 150)
    .join('\n') || 'No file tree cached';

  const formattedCodeSnippets = (entrypointCodeContents || [])
    .map(file => `### File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``)
    .join('\n\n') || 'No code snippets fetched';

  const formattedLanguages = Object.entries(languages || {})
    .map(([lang, bytes]) => `${lang}: ${bytes} bytes`)
    .join(', ') || 'Unknown';

  const formattedContributors = (contributors || [])
    .map(c => `- ${c.name} (${c.commits || 0} commits, ${c.percentage || 0}%)`)
    .join('\n') || 'None';

  const assignments = taskPlan?.assignments || [];
  const formattedTasks = assignments
    .map(a => `- Member: ${a.member}\n  Assigned Tasks: ${(a.assignedTasks || []).map(t => `[${t.status}] ${t.task}`).join(', ')}`)
    .join('\n') || 'No tasks assigned';

  const promptText = `Perform GitHub Repository Intelligence scan.

INPUTS:
1. PROJECT DESCRIPTION:
- Name: ${projectDetails?.projectName || 'N/A'}
- Problem Statement: ${projectDetails?.problemStatement || 'N/A'}
- Features To Build: ${(projectDetails?.featuresToBuild || []).join(', ') || 'N/A'}
- Planned Tech Stack: ${JSON.stringify(finalTechStack || {})}

2. TEAM & TASK PLAN STATUS:
- Tasks & Statuses:
${formattedTasks}
- Scheduled Duration / Progress: ${completedTasks}/${totalTasks} tasks completed. Time remaining: ${timeRemaining}

3. GIT HUB METRICS & REPO HEALTH:
- Languages: ${formattedLanguages}
- Contributor Commits:
${formattedContributors}
- Raw Health Indicators: README present: ${hasReadme}, Tests present: ${hasTestFiles}, Deployment Config: ${hasDeployment}

4. FILE STRUCTURE & TREE (MAX 150 files):
${formattedTree}

5. PACKAGE DEPENDENCIES (package.json contents):
${packageJsonContent || 'package.json not detected'}

6. README FILE CONTENT:
${readmeContent || 'README.md not detected or empty'}

7. KEY ENTRYPOINT CODE SNIPPETS:
${formattedCodeSnippets}`;

  return {
    contents: promptText,
    systemInstruction: promptVersionManager.getInstruction('analyzeGitHubRepository'),
    promptVersion: promptVersionManager.getVersion('analyzeGitHubRepository')
  };
};

module.exports = {
  buildTeamAnalysisPrompt,
  buildProjectReviewPrompt,
  buildMentorChatPrompt,
  buildTaskPlanPrompt,
  buildMarketplacePrompt,
  buildTechStackPrompt,
  buildCommandCenterPrompt,
  buildGitHubRepoPrompt
};
