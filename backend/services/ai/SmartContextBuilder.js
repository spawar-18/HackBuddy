const Project = require('../../models/Project');
const Team = require('../../models/Team');
const HackathonConfig = require('../../models/HackathonConfig');
const TaskMarketplaceRequest = require('../../models/TaskMarketplaceRequest');
const GitHubRepository = require('../../models/GitHubRepository');
const ConversationMemory = require('../../models/ConversationMemory');
const TechStackProposal = require('../../models/TechStackProposal');
const TechStackVote = require('../../models/TechStackVote');
const TopicClassifier = require('./TopicClassifier');

const TOPIC_KEYWORDS = {
  authentication: ['auth', 'jwt', 'oauth', 'login', 'signup', 'token', 'session', 'google login', 'github login', 'bcrypt', 'passport', 'signout', 'password'],
  deployment: ['deploy', 'deployment', 'render', 'netlify', 'vercel', 'docker', 'production', 'hosting', 'ci/cd', 'pipeline', 'env ', 'environment variable', 'port', 'nginx'],
  github: ['github', 'repo', 'repository', 'commit', 'branch', 'pull request', 'pr ', 'issue', 'merge', 'contributor', 'git '],
  database: ['mongodb', 'database', 'schema', 'collection', 'index', 'mongoose', 'atlas', 'query', 'aggregate', 'sql', 'nosql', 'db ', 'postgres', 'mysql'],
  ai_integration: ['openrouter', 'gemini', 'glm', 'deepseek', 'featherless', 'openai', 'anthropic', 'prompt engineering', 'llm', 'rag', 'vector', 'ai provider', 'ai integration', 'ai pipeline', 'language model', 'ai api', 'ai model', 'integrate ai', 'ai service'],
  tasks: ['task splitter', 'task plan', 'task assignment', 'workload', 'sprint', 'epic', 'deliverable', 'assigned task', 'task status', 'todo list'],
  marketplace: ['marketplace', 'claim task', 'swap task', 'reassign', 'request task', 'bounty'],
  command_center: ['command center', 'hackathon status', 'velocity', 'critical path', 'blocked task', 'burndown', 'time remaining', 'hackathon timer', 'progress report'],
  project_review: ['project review', 'feasibility', 'review feedback', 'audit', 'review score'],
  ui: ['screenshot', 'mockup', 'wireframe', 'design review', 'tailwind', 'css styling', 'ui design', 'ux design', 'component styling', 'sass', 'dark mode', 'responsive design'],
  backend: ['node.js', 'express.js', 'express route', 'controller', 'middleware', 'route handler', 'rest api', 'server error', 'http request', 'backend logic'],
  frontend: ['react', 'vite', 'react component', 'react hook', 'frontend', 'state management', 'redux', 'useeffect', 'usestate', 'client side', 'browser rendering'],
  debugging: ['debug', 'bug', 'error', 'fix', 'crash', 'exception', 'stack trace', 'failing', 'broken', 'issue', 'warn', 'fail', 'logs'],
  architecture: ['architecture', 'system design', 'scalability', 'microservice', 'monolith', 'design pattern', 'refactor', 'structure', 'modular'],
  performance: ['performance', 'optimization', 'latency', 'speed', 'slow', 'cache', 'memory leak', 'optimize', 'fast', 'benchmark'],
  security: ['security', 'xss', 'csrf', 'sanitize', 'helmet', 'vulnerability', 'injection', 'encryption', 'hash', 'ssl', 'tokens', 'hashing'],
  notifications: ['notification', 'alert', 'email', 'push', 'ws', 'websocket', 'socket.io', 'message', 'realtime', 'real-time'],
  testing: ['test', 'jest', 'cypress', 'qa', 'unit test', 'integration test', 'e2e', 'mocha', 'chai', 'testing']
};

class SmartContextBuilder {
  async buildContext(projectId, userQuestion = '') {
    const classification = TopicClassifier.classify(userQuestion);

    if (classification.isOffTopic) {
      return {
        contextText: '',
        sectionsUsed: [],
        topic: classification.topic,
        isOffTopic: true,
        refusalMessage: classification.refusalMessage
      };
    }

    if (!projectId) {
      return {
        contextText: 'No Project ID provided.',
        sectionsUsed: [],
        topic: classification.topic,
        isOffTopic: false
      };
    }

    const data = await this.loadProjectData(projectId);
    if (!data.project) {
      return {
        contextText: `Project not found for ID: ${projectId}`,
        sectionsUsed: [],
        topic: classification.topic,
        isOffTopic: false
      };
    }

    const topic = classification.topic;
    const keywords = TOPIC_KEYWORDS[topic] || [];

    let contextText = '==================================================\n';
    contextText += 'HACKBUDDY AI MENTOR — DYNAMIC PROJECT CONTEXT\n';
    contextText += `Classified Developer Intent: ${topic.toUpperCase()}\n`;
    contextText += '==================================================\n\n';

    const sectionsUsed = [];

    // Always include Project Overview basics
    contextText += this.buildCoreSection(data, keywords, topic);
    sectionsUsed.push('Project Overview');

    // Add Tech Stack info
    contextText += this.buildTechStackSection(data, keywords, topic);
    sectionsUsed.push('Tech Stack');

    // Add filtered Tasks & Progress
    const tasksSec = this.buildTasksSection(data, keywords, topic);
    if (tasksSec) {
      contextText += tasksSec;
      sectionsUsed.push('Relevant Tasks');
    }

    // Add filtered Files & Structure
    const filesSec = this.buildGitHubSection(data, keywords, topic);
    if (filesSec) {
      contextText += filesSec;
      sectionsUsed.push('GitHub & File Tree');
    }

    // Add filtered Review Checklist
    const reviewSec = this.buildReviewSection(data, keywords, topic);
    if (reviewSec) {
      contextText += reviewSec;
      sectionsUsed.push('AI Review Checklist');
    }

    // Add filtered Alerts / Command Center
    const alertsSec = this.buildCommandCenterSection(data, keywords, topic);
    if (alertsSec) {
      contextText += alertsSec;
      sectionsUsed.push('Command Center Alerts');
    }

    // Add filtered Marketplace
    const marketSec = this.buildMarketplaceSection(data, keywords, topic);
    if (marketSec) {
      contextText += marketSec;
      sectionsUsed.push('Marketplace Context');
    }

    // Add Hackathon countdown details
    const hackSec = this.buildHackathonSection(data, keywords, topic);
    if (hackSec) {
      contextText += hackSec;
      sectionsUsed.push('Hackathon Schedule');
    }

    // Add Memory context
    const memSec = this.buildMemorySection(data, keywords, topic);
    if (memSec) {
      contextText += memSec;
      sectionsUsed.push('Prior Decisions Memory');
    }

    contextText += '==================================================\n';

    return {
      contextText: contextText.trim(),
      sectionsUsed,
      topic,
      isOffTopic: false
    };
  }

  async loadProjectData(projectId) {
    const [
      project,
      hackConfig,
      gitRepo,
      marketplaceReqs,
      memory,
      techProposal,
      techVotes
    ] = await Promise.all([
      Project.findById(projectId),
      HackathonConfig.findOne({ projectId }),
      GitHubRepository.findOne({ projectId }),
      TaskMarketplaceRequest.find({ projectId }),
      ConversationMemory.findOne({ projectId }),
      TechStackProposal.findOne({ projectId }),
      TechStackVote.find({ projectId })
    ]);

    const team = project
      ? await Team.findById(project.teamId).populate('members', 'name skills role')
      : null;

    return { project, team, hackConfig, gitRepo, marketplaceReqs, memory, techProposal, techVotes };
  }

  matchKeywords(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.trim().toLowerCase()));
  }

  buildCoreSection({ project }, keywords, topic) {
    let section = '--- PROJECT OVERVIEW ---\n';
    section += `Project Name: ${project.projectName || 'N/A'}\n`;
    section += `Problem Statement: ${project.problemStatement || 'N/A'}\n`;
    section += `Description: ${project.description || 'N/A'}\n`;
    section += `Track: ${project.track || 'N/A'}\n`;
    section += `Status: ${project.status || 'Planning'}\n`;
    
    // Filter features relevant to intent
    const features = project.featuresToBuild || [];
    const relevantFeatures = topic === 'general_project'
      ? features
      : features.filter(f => this.matchKeywords(f, keywords));

    section += `Relevant Features to Build:\n`;
    if (relevantFeatures.length > 0) {
      relevantFeatures.forEach(f => {
        section += `  - ${f}\n`;
      });
    } else if (features.length > 0) {
      section += `  (No matching features, showing general features)\n`;
      features.slice(0, 3).forEach(f => {
        section += `  - ${f}\n`;
      });
    } else {
      section += `  - None specified\n`;
    }
    section += '\n';
    return section;
  }

  buildTechStackSection({ project, techProposal }, keywords, topic) {
    let section = '--- TECH STACK ---\n';
    const stack = project.finalTechStack || {};
    section += `Approved Tech Stack: Frontend=${stack.frontend || 'TBD'}, Backend=${stack.backend || 'TBD'}, Database=${stack.database || 'TBD'}, AI=${stack.ai || 'TBD'}, Deployment=${stack.deployment || 'TBD'}\n`;
    
    if (techProposal && (topic === 'general_project' || topic === 'deployment' || topic === 'architecture')) {
      section += `Active Proposal: Status=${techProposal.status} | Proposed Stack: Frontend=${techProposal.frontend || 'N/A'}, Backend=${techProposal.backend || 'N/A'}, DB=${techProposal.database || 'N/A'}\n`;
    }
    section += '\n';
    return section;
  }

  buildTasksSection({ project }, keywords, topic) {
    if (!project.taskPlan?.assignments) return '';

    let section = '--- RELEVANT TASKS & PROGRESS ---\n';
    let count = 0;

    project.taskPlan.assignments.forEach(assignee => {
      const matchedTasks = (assignee.assignedTasks || []).filter(task => {
        if (topic === 'general_project') return task.status === 'In Progress' || task.status === 'Blocked' || task.priority === 'High';
        return this.matchKeywords(task.task || task.taskName || '', keywords) || this.matchKeywords(task.epic || '', keywords) || this.matchKeywords(task.category || '', keywords);
      });

      if (matchedTasks.length > 0) {
        matchedTasks.forEach(task => {
          section += `  - [${task.status}] ${task.task || task.taskName} (Assigned: ${assignee.member} | Priority: ${task.priority || 'Medium'} | Difficulty: ${task.difficulty || 'Medium'})\n`;
          count++;
        });
      }
    });

    if (count === 0) {
      // Fallback: show any high-priority/in-progress tasks
      let fallbackCount = 0;
      project.taskPlan.assignments.forEach(assignee => {
        (assignee.assignedTasks || []).slice(0, 2).forEach(task => {
          section += `  - [${task.status}] ${task.task || task.taskName} (Assigned: ${assignee.member} | Priority: ${task.priority || 'Medium'})\n`;
          fallbackCount++;
        });
      });
      if (fallbackCount === 0) return '';
    }

    section += '\n';
    return section;
  }

  buildGitHubSection({ gitRepo }, keywords, topic) {
    if (!gitRepo) return '';

    let section = '--- GITHUB REPO & FILES ---\n';
    section += `Repo URL: ${gitRepo.repositoryUrl || 'N/A'} (Health Score: ${gitRepo.healthScore || 0}/100)\n`;

    const tree = gitRepo.cachedData?.tree || [];
    const matchedFiles = tree.filter(f => {
      const pathStr = f.path || '';
      return this.matchKeywords(pathStr, keywords);
    }).slice(0, 10); // Limit to 10 files to avoid clutter

    if (matchedFiles.length > 0) {
      section += `Relevant Repository Files:\n`;
      matchedFiles.forEach(f => {
        section += `  - ${f.path} (${f.type || 'blob'})\n`;
      });
    }

    const issues = gitRepo.cachedData?.issues || [];
    const matchedIssues = issues.filter(iss => {
      return this.matchKeywords(iss.title || '', keywords) || this.matchKeywords(iss.body || '', keywords);
    }).slice(0, 3);

    if (matchedIssues.length > 0) {
      section += `Relevant GitHub Issues:\n`;
      matchedIssues.forEach(iss => {
        section += `  - Issue #${iss.number}: "${iss.title}" (State: ${iss.state})\n`;
      });
    }

    const prs = gitRepo.cachedData?.pullRequests || [];
    const matchedPrs = prs.filter(pr => {
      return this.matchKeywords(pr.title || '', keywords) || this.matchKeywords(pr.body || '', keywords);
    }).slice(0, 3);

    if (matchedPrs.length > 0) {
      section += `Relevant Pull Requests:\n`;
      matchedPrs.forEach(pr => {
        section += `  - PR #${pr.number}: "${pr.title}" (State: ${pr.state})\n`;
      });
    }

    section += '\n';
    return section;
  }

  buildReviewSection({ project }, keywords, topic) {
    const review = project.projectReview;
    if (!review) return '';

    let section = '--- RELEVANT REVIEW FEEDBACK ---\n';
    let added = false;

    // Filter MUST BUILD features matching keywords
    const mvps = (review.mustBuildFeatures || []).filter(f => topic === 'general_project' || this.matchKeywords(f, keywords));
    if (mvps.length > 0) {
      section += `Must-Build MVP features:\n`;
      mvps.slice(0, 4).forEach(f => { section += `  - ${f}\n`; });
      added = true;
    }

    // Filter risks
    const risks = (review.projectRisks || []).filter(r => topic === 'general_project' || this.matchKeywords(r, keywords));
    if (risks.length > 0) {
      section += `Identified Tech Risks:\n`;
      risks.slice(0, 4).forEach(r => { section += `  - ${r}\n`; });
      added = true;
    }

    // Filter execution strategy steps
    const steps = (review.executionStrategy || []).filter(s => topic === 'general_project' || this.matchKeywords(s, keywords));
    if (steps.length > 0) {
      section += `Execution Strategy Steps:\n`;
      steps.slice(0, 4).forEach(s => { section += `  - ${s}\n`; });
      added = true;
    }

    if (!added) return '';
    section += '\n';
    return section;
  }

  buildCommandCenterSection({ project }, keywords, topic) {
    const report = project.commandCenterReport;
    if (!report) return '';

    let section = '--- RELEVANT COMMAND CENTER ALERTS ---\n';
    const alerts = (report.alerts || []).filter(a => {
      if (topic === 'general_project') return a.severity === 'Critical' || a.severity === 'Warning';
      return this.matchKeywords(a.message || '', keywords) || this.matchKeywords(a.category || '', keywords);
    });

    if (alerts.length === 0) return '';

    alerts.slice(0, 4).forEach(a => {
      section += `  - [Severity: ${a.severity}] ${a.message} (Category: ${a.category})\n`;
    });

    section += '\n';
    return section;
  }

  buildMarketplaceSection({ marketplaceReqs }, keywords, topic) {
    if (!marketplaceReqs || marketplaceReqs.length === 0) return '';

    let section = '--- RELEVANT MARKETPLACE REQUESTS ---\n';
    let count = 0;

    marketplaceReqs.forEach(req => {
      const match = topic === 'general_project' || this.matchKeywords(req.taskName || req.taskId || '', keywords);
      if (match) {
        section += `  - [Status: ${req.status}] ${req.requestType} for task "${req.taskName || req.taskId}"\n`;
        count++;
      }
    });

    if (count === 0) return '';
    section += '\n';
    return section;
  }

  buildHackathonSection({ hackConfig }, keywords, topic) {
    if (!hackConfig) return '';
    if (!['general_project', 'command_center', 'deployment', 'tasks'].includes(topic)) return '';

    let section = '--- HACKATHON TIMELINE ---\n';
    section += `Hackathon Name: ${hackConfig.hackathonName || 'N/A'}\n`;
    section += `Current Phase: ${hackConfig.status || 'N/A'}\n`;
    
    if (hackConfig.endTime) {
      const diffMs = hackConfig.endTime - new Date();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        section += `Time Remaining: ${hours} hours, ${mins} minutes left\n`;
      } else {
        section += 'Time Remaining: Hackathon ended\n';
      }
    }
    section += '\n';
    return section;
  }

  buildMemorySection({ memory }, keywords, topic) {
    if (!memory) return '';

    let section = '--- CONVERSATION MEMORY ---\n';
    if (memory.summary) {
      section += `Rolling Conversation Summary: ${memory.summary}\n`;
    }

    const arch = (memory.architectureDecisions || []).filter(d => topic === 'general_project' || this.matchKeywords(d, keywords));
    if (arch.length > 0) {
      section += `Decided Architectures:\n`;
      arch.slice(0, 3).forEach(d => { section += `  - ${d}\n`; });
    }

    const stack = (memory.techStackDecisions || []).filter(d => topic === 'general_project' || this.matchKeywords(d, keywords));
    if (stack.length > 0) {
      section += `Decided Stack details:\n`;
      stack.slice(0, 3).forEach(d => { section += `  - ${d}\n`; });
    }

    const blockers = (memory.currentBlockers || []).filter(b => topic === 'general_project' || this.matchKeywords(b, keywords));
    if (blockers.length > 0) {
      section += `Current blockers:\n`;
      blockers.slice(0, 3).forEach(b => { section += `  - ${b}\n`; });
    }

    const advice = (memory.previousAiAdvice || memory.recentRecommendations || []).filter(a => topic === 'general_project' || this.matchKeywords(a, keywords));
    if (advice.length > 0) {
      section += `Prior Advice Accepted:\n`;
      advice.slice(0, 3).forEach(a => { section += `  - ${a}\n`; });
    }

    section += '\n';
    return section;
  }
}

module.exports = new SmartContextBuilder();
