const Project = require('../../models/Project');
const Team = require('../../models/Team');
const User = require('../../models/User');
const HackathonConfig = require('../../models/HackathonConfig');
const TaskMarketplaceRequest = require('../../models/TaskMarketplaceRequest');
const GitHubRepository = require('../../models/GitHubRepository');
const ConversationMemory = require('../../models/ConversationMemory');
const Notification = require('../../models/Notification');
const ProjectChat = require('../../models/ProjectChat');
const TechStackProposal = require('../../models/TechStackProposal');
const TechStackVote = require('../../models/TechStackVote');
const CacheManager = require('./CacheManager');

/**
 * ContextBuilder
 * Dynamically aggregates project context from MongoDB collections:
 * Project, Team, HackathonConfig, GitHubRepository, TaskMarketplaceRequest,
 * ConversationMemory, Notifications, TechStackProposal, TechStackVote.
 */
class ContextBuilder {
  /**
   * Builds the central project context.
   * Uses CacheManager to retrieve cached context string if not bypassed.
   * @param {string} projectId 
   * @param {boolean} bypassCache 
   * @returns {Promise<string>}
   */
  async buildContext(projectId, bypassCache = false) {
    if (!projectId) {
      return 'No Project ID provided. Cannot gather central context.';
    }

    if (!bypassCache) {
      const cached = CacheManager.getContext(projectId);
      if (cached) {
        return cached;
      }
    }

    try {
      // Fetch everything concurrently to optimize performance
      const [
        project,
        hackConfig,
        gitRepo,
        marketplaceReqs,
        memory,
        notifications,
        chatHistory,
        techProposal,
        techVotes
      ] = await Promise.all([
        Project.findById(projectId),
        HackathonConfig.findOne({ projectId }),
        GitHubRepository.findOne({ projectId }),
        TaskMarketplaceRequest.find({ projectId }),
        ConversationMemory.findOne({ projectId }),
        Notification.find({ projectId }).sort({ createdAt: -1 }).limit(10),
        ProjectChat.find({ projectId }).sort({ createdAt: -1 }).limit(20),
        TechStackProposal.findOne({ projectId }),
        TechStackVote.find({ projectId })
      ]);

      if (!project) {
        return `Project not found for ID: ${projectId}`;
      }

      // Fetch team separately to populate members
      const team = await Team.findById(project.teamId).populate('members', 'name skills role');

      let context = '==================================================\n';
      context += 'CENTRAL AI ENGINE PROJECT CONTEXT\n';
      context += '==================================================\n\n';

      // 1. Core Project Info
      context += '--- 1. CORE PROJECT DATA ---\n';
      context += `Project Name: ${project.projectName || 'N/A'}\n`;
      context += `Problem Statement: ${project.problemStatement || 'N/A'}\n`;
      context += `Description: ${project.description || 'N/A'}\n`;
      context += `Objectives: ${project.objectives ? project.objectives.join(', ') : 'N/A'}\n`;
      context += `Track: ${project.track || 'N/A'}\n`;
      context += `Planned Duration: ${project.duration || 'N/A'}\n`;
      context += `Status: ${project.status || 'Planning'}\n`;
      context += `Features to Build:\n`;
      (project.featuresToBuild || []).forEach(f => {
        context += `  - ${f}\n`;
      });
      context += '\n';

      // 2. Selected Tech Stack & Consensus Voting
      context += '--- 2. TECH STACK & VOTING ---\n';
      const stack = project.finalTechStack || {};
      context += `Current Selected Tech Stack:\n`;
      context += `  - Frontend: ${stack.frontend || 'Not specified'}\n`;
      context += `  - Backend: ${stack.backend || 'Not specified'}\n`;
      context += `  - Database: ${stack.database || 'Not specified'}\n`;
      context += `  - AI Layer: ${stack.ai || 'Not specified'}\n`;
      context += `  - Deployment: ${stack.deployment || 'Not specified'}\n`;
      
      if (techProposal) {
        context += `Proposed Tech Stack:\n`;
        context += `  - Status: ${techProposal.status}\n`;
        context += `  - Frontend: ${techProposal.frontend || 'N/A'}\n`;
        context += `  - Backend: ${techProposal.backend || 'N/A'}\n`;
        context += `  - Database: ${techProposal.database || 'N/A'}\n`;
        context += `  - AI Layer: ${techProposal.ai || 'N/A'}\n`;
        context += `  - Deployment: ${techProposal.deployment || 'N/A'}\n`;
      }
      if (techVotes && techVotes.length > 0) {
        context += `Votes Cast:\n`;
        techVotes.forEach(v => {
          context += `  - Member ID ${v.userId}: Vote: ${v.voteType} | Reason: "${v.reason}" | Confidence: ${JSON.stringify(v.confidenceScores)}\n`;
        });
      }
      context += '\n';

      // 3. Team Profile
      context += '--- 3. TEAM MEMBERS, ROLES, & SKILLS ---\n';
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

      // 4. Task Plan Breakdown (Current Sprint tasks)
      context += '--- 4. TASK SPLITTER (SPRINT PROGRESS) ---\n';
      if (project.taskPlan && project.taskPlan.assignments) {
        const plan = project.taskPlan;
        
        let completed = [];
        let inProgress = [];
        let notStarted = [];
        let blocked = [];

        plan.assignments.forEach(a => {
          (a.assignedTasks || []).forEach(task => {
            const tInfo = { ...task, member: a.member };
            if (task.status === 'Completed') completed.push(tInfo);
            else if (task.status === 'In Progress') inProgress.push(tInfo);
            else if (task.status === 'Blocked') blocked.push(tInfo);
            else notStarted.push(tInfo);
          });
        });

        context += `Task Progress Summary: ${completed.length} Completed | ${inProgress.length} In Progress | ${blocked.length} Blocked | ${notStarted.length} Pending\n`;
        context += `Completed Tasks:\n`;
        completed.forEach(t => context += `  - [${t.member}] ${t.task}\n`);
        context += `In Progress Tasks:\n`;
        inProgress.forEach(t => context += `  - [${t.member}] ${t.task}\n`);
        context += `Blocked Tasks:\n`;
        blocked.forEach(t => context += `  - [${t.member}] ${t.task}\n`);
        context += `Pending Tasks:\n`;
        notStarted.forEach(t => context += `  - [${t.member}] ${t.task}\n`);
      } else {
        context += `No task plan breakdown generated yet.\n`;
      }
      context += '\n';

      // 5. Task Marketplace
      context += '--- 5. TASK MARKETPLACE ACTIVE REQUESTS ---\n';
      if (marketplaceReqs && marketplaceReqs.length > 0) {
        marketplaceReqs.forEach(req => {
          context += `- [${req.status}] ${req.requestType} for task "${req.taskId}" by ${req.requestedBy || 'Unknown'}\n`;
        });
      } else {
        context += `No active marketplace requests.\n`;
      }
      context += '\n';

      // 6. Hackathon Configuration & Schedule
      context += '--- 6. HACKATHON SCHEDULE ---\n';
      if (hackConfig) {
        context += `Hackathon Name: ${hackConfig.hackathonName || 'N/A'}\n`;
        context += `Phase: ${hackConfig.status || 'N/A'}\n`;
        context += `Start Time: ${hackConfig.startTime ? hackConfig.startTime.toISOString() : 'N/A'}\n`;
        context += `End Time: ${hackConfig.endTime ? hackConfig.endTime.toISOString() : 'N/A'}\n`;
        
        const now = new Date();
        const diffMs = hackConfig.endTime - now;
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / 3600000);
          const mins = Math.floor((diffMs % 3600000) / 60000);
          context += `Time Remaining: ${hours} hours, ${mins} minutes left\n`;
        } else {
          context += `Time Remaining: 0 hours left (Ended)\n`;
        }
      } else {
        context += `No hackathon configuration linked to this project.\n`;
      }
      context += '\n';

      // 7. Command Center Report
      context += '--- 7. COMMAND CENTER STATUS ---\n';
      if (project.commandCenterReport) {
        const rpt = project.commandCenterReport;
        context += `Overall Status: ${rpt.overallStatus || 'N/A'}\n`;
        context += `Risk Level: ${rpt.riskLevel || 'N/A'}\n`;
        context += `Winning Probability Estimate: ${rpt.winningProbability || 'N/A'}%\n`;
        context += `Completion Prediction: ${rpt.completionPrediction || 'N/A'}\n`;
        context += `Current Alerts:\n`;
        (rpt.alerts || []).forEach(a => context += `  - [${a.severity}] ${a.message}\n`);
      } else {
        context += `No Command Center status available.\n`;
      }
      context += '\n';

      // 8. Project Review
      context += '--- 8. PROJECT REVIEW STRATEGY ---\n';
      if (project.projectReview) {
        const review = project.projectReview;
        context += `Feasibility Score: ${review.feasibilityScore || 'N/A'}/10\n`;
        context += `Judge Perspective: ${review.judgePerspective || 'N/A'}\n`;
        context += `Execution Strategy Checklist:\n`;
        (review.executionStrategy || []).forEach(e => context += `  - ${e}\n`);
      } else {
        context += `No Project Feasibility Review generated yet.\n`;
      }
      context += '\n';

      // 9. GitHub Repository status
      context += '--- 9. GITHUB REPOSITORY STATUS & HEALTH ---\n';
      if (gitRepo) {
        context += `Repo URL: ${gitRepo.repositoryUrl || 'N/A'}\n`;
        context += `Connection Status: ${gitRepo.connectionStatus || 'N/A'}\n`;
        context += `Repository Health Status: ${gitRepo.healthStatus || 'N/A'} (Score: ${gitRepo.healthScore || 0}/100)\n`;
        if (gitRepo.cachedData) {
          const cd = gitRepo.cachedData;
          context += `Readme Present: ${cd.hasReadme || false}\n`;
          context += `Test files detected: ${cd.hasTestFiles || false}\n`;
          context += `Deployment configuration present: ${cd.hasDeployment || false}\n`;
          
          context += `Recent Commits:\n`;
          (cd.commits || []).slice(0, 5).forEach(c => {
            context += `  - [${c.sha ? c.sha.substring(0, 7) : ''}] "${c.commit?.message || ''}" by ${c.commit?.author?.name || 'Unknown'}\n`;
          });
          context += `Active Pull Requests:\n`;
          (cd.pullRequests || []).slice(0, 3).forEach(pr => {
            context += `  - [#${pr.number}] ${pr.title} (State: ${pr.state})\n`;
          });
          context += `Active Issues:\n`;
          (cd.issues || []).slice(0, 3).forEach(iss => {
            context += `  - [#${iss.number}] ${iss.title} (State: ${iss.state})\n`;
          });
        }
      } else {
        context += `No connected GitHub repository.\n`;
      }
      context += '\n';

      // 10. AI Memory & Previous Recommendations
      context += '--- 10. CONVERSATION MEMORY & KEY DECISIONS ---\n';
      if (memory) {
        context += `Memory Summary: ${memory.summary || 'None'}\n`;
        context += `Decided Architecture Decisions:\n`;
        (memory.architectureDecisions || []).forEach(d => context += `  - ${d}\n`);
        context += `Decided Tech Stack Decisions:\n`;
        (memory.techStackDecisions || []).forEach(d => context += `  - ${d}\n`);
        context += `Previous AI Recommendations:\n`;
        (memory.previousAiAdvice || []).forEach(a => context += `  - ${a}\n`);
      } else {
        context += `No conversation memory registered.\n`;
      }
      context += '\n';

      // 11. Timeline & Notifications
      context += '--- 11. RECENT NOTIFICATIONS & TIMELINE ---\n';
      if (notifications && notifications.length > 0) {
        notifications.forEach(n => {
          context += `  - [${n.createdAt.toISOString()}] [${n.type}] ${n.message}\n`;
        });
      } else {
        context += `No recent notifications.\n`;
      }
      context += '\n';

      // 12. Chat History Context (Removed to prevent duplication, now handled natively as message array in PromptManager)

      context += '==================================================\n';

      const contextString = context.trim();
      CacheManager.setContext(projectId, contextString);
      return contextString;
    } catch (err) {
      console.error('[ContextBuilder] Error generating centralized context:', err.message);
      return `Failed to compile central context: ${err.message}`;
    }
  }
}

module.exports = new ContextBuilder();
