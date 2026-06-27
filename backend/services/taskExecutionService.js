const crypto = require('crypto');

const TASK_CATEGORIES = [
  'Frontend',
  'Backend',
  'Database',
  'AI',
  'API',
  'Testing',
  'Deployment',
  'Documentation'
];

const CATEGORY_SKILLS = {
  Frontend: ['react', 'vite', 'tailwind', 'css', 'html', 'ui', 'frontend', 'javascript', 'typescript'],
  Backend: ['node', 'express', 'api', 'backend', 'server', 'jwt', 'auth', 'javascript', 'typescript'],
  Database: ['mongodb', 'mongoose', 'database', 'schema', 'aggregation', 'redis'],
  AI: ['ai', 'ml', 'llm', 'prompt', 'gemini', 'deepseek', 'glm', 'openai', 'python'],
  API: ['rest', 'api', 'express', 'axios', 'integration', 'http'],
  Testing: ['test', 'playwright', 'jest', 'qa', 'unit', 'integration'],
  Deployment: ['deploy', 'devops', 'vercel', 'render', 'docker', 'ci', 'github actions'],
  Documentation: ['docs', 'readme', 'technical writing', 'presentation', 'documentation']
};

const CATEGORY_TECH = {
  Frontend: ['React', 'Vite', 'Tailwind CSS'],
  Backend: ['Node.js', 'Express'],
  Database: ['MongoDB', 'Mongoose'],
  AI: ['GLM', 'DeepSeek', 'Gemini', 'Prompt Engineering'],
  API: ['REST API', 'Axios', 'Express Router'],
  Testing: ['Playwright', 'API Tests'],
  Deployment: ['Render', 'Vercel', 'Environment Variables'],
  Documentation: ['README', 'Architecture Notes']
};

const DEFAULT_HOURS = {
  Frontend: 3,
  Backend: 3,
  Database: 2,
  AI: 4,
  API: 2,
  Testing: 2,
  Deployment: 2,
  Documentation: 1
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48);

const stableId = (parts) => {
  const hash = crypto.createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 8);
  return `${slugify(parts[0] || 'task')}-${hash}`;
};

const normalizeSkills = (skills = []) => skills.map(skill => String(skill || '').toLowerCase().trim()).filter(Boolean);

const inferExperienceLevel = (member) => {
  const skillsCount = (member.skills || []).length;
  if (member.experienceLevel) return member.experienceLevel;
  if (skillsCount >= 8) return 'Advanced';
  if (skillsCount >= 4) return 'Intermediate';
  return 'Beginner';
};

const getFeatureKind = (feature) => {
  const lower = String(feature || '').toLowerCase();
  if (lower.includes('auth') || lower.includes('login') || lower.includes('oauth')) return 'Authentication';
  if (lower.includes('github') || lower.includes('repo') || lower.includes('commit')) return 'GitHub Integration';
  if (lower.includes('mentor') || lower.includes('ai') || lower.includes('review') || lower.includes('command')) return 'AI Feature';
  if (lower.includes('notification') || lower.includes('alert')) return 'Notification System';
  if (lower.includes('deploy') || lower.includes('hosting')) return 'Deployment';
  if (lower.includes('marketplace') || lower.includes('task')) return 'Task Execution';
  return 'Core Product Feature';
};

const taskNameFor = (feature, category) => {
  const kind = getFeatureKind(feature);
  const featureName = String(feature || 'Feature').trim();

  const templates = {
    Authentication: {
      Frontend: 'Build login and protected route UI',
      Backend: 'Create JWT authentication middleware',
      Database: 'Create user identity schema fields',
      AI: 'Add mentor-safe auth context rules',
      API: 'Implement login, register, and session APIs',
      Testing: 'Write authentication flow tests',
      Deployment: 'Configure auth secrets for deployment',
      Documentation: 'Document authentication setup'
    },
    'GitHub Integration': {
      Frontend: 'Build repository insights panel',
      Backend: 'Implement GitHub sync service handlers',
      Database: 'Persist repository sync snapshots',
      AI: 'Create repository intelligence prompt context',
      API: 'Add repository connect and sync endpoints',
      Testing: 'Test GitHub sync and analysis flows',
      Deployment: 'Configure GitHub token environment variables',
      Documentation: 'Document repository integration workflow'
    },
    'AI Feature': {
      Frontend: `Build ${featureName} result view`,
      Backend: `Route ${featureName} through AI orchestrator`,
      Database: `Persist ${featureName} generated output`,
      AI: `Design ${featureName} prompt and schema`,
      API: `Expose ${featureName} generation endpoint`,
      Testing: `Validate ${featureName} schema and fallback behavior`,
      Deployment: `Configure ${featureName} provider environment`,
      Documentation: `Document ${featureName} AI behavior`
    },
    'Notification System': {
      Frontend: 'Build targeted notification inbox',
      Backend: 'Implement targeted notification dispatcher',
      Database: 'Create notification read-state records',
      AI: 'Generate risk-aware notification recommendations',
      API: 'Expose notification read and fetch endpoints',
      Testing: 'Test targeted notification permissions',
      Deployment: 'Verify notification polling in production',
      Documentation: 'Document notification events'
    },
    Deployment: {
      Frontend: 'Add deployment readiness indicators',
      Backend: 'Prepare production server configuration',
      Database: 'Configure production database connection',
      AI: 'Validate deployment risk checklist',
      API: 'Add production health-check endpoint',
      Testing: 'Run production smoke test checklist',
      Deployment: 'Deploy frontend and backend services',
      Documentation: 'Write deployment runbook'
    },
    'Task Execution': {
      Frontend: `Build ${featureName} workflow UI`,
      Backend: `Implement ${featureName} workflow service`,
      Database: `Persist ${featureName} audit trail`,
      AI: `Add ${featureName} recommendation logic`,
      API: `Expose ${featureName} workflow endpoints`,
      Testing: `Test ${featureName} permissions and state transitions`,
      Deployment: `Verify ${featureName} production readiness`,
      Documentation: `Document ${featureName} workflow`
    },
    'Core Product Feature': {
      Frontend: `Build ${featureName} interface`,
      Backend: `Implement ${featureName} business logic`,
      Database: `Create ${featureName} persistence model`,
      AI: `Add ${featureName} AI context if needed`,
      API: `Expose ${featureName} API routes`,
      Testing: `Write ${featureName} acceptance tests`,
      Deployment: `Verify ${featureName} deployment readiness`,
      Documentation: `Document ${featureName} behavior`
    }
  };

  return templates[kind][category];
};

const buildDependencies = (feature, category, allTaskIdsByCategory) => {
  const chain = {
    Database: [],
    Backend: ['Database'],
    API: ['Backend'],
    AI: ['API'],
    Frontend: ['API'],
    Testing: ['Frontend', 'Backend', 'AI'],
    Deployment: ['Testing'],
    Documentation: ['Deployment']
  };

  return (chain[category] || [])
    .map(depCategory => allTaskIdsByCategory[`${feature}:${depCategory}`])
    .filter(Boolean);
};

const calculateCompatibility = (member, category, task, currentAssignedHours = 0) => {
  const skills = normalizeSkills(member.skills || []);
  const preferredTech = normalizeSkills(member.preferredTechnologies || member.preferredTech || []);
  const required = CATEGORY_SKILLS[category] || [];
  const tech = normalizeSkills(task.suggestedTechnologies || []);
  const exp = inferExperienceLevel(member);

  const skillHits = required.filter(skill => skills.some(memberSkill => memberSkill.includes(skill) || skill.includes(memberSkill))).length;
  const techHits = tech.filter(t => preferredTech.some(pref => pref.includes(t) || t.includes(pref)) || skills.some(skill => skill.includes(t) || t.includes(skill))).length;
  const skillScore = required.length ? (skillHits / required.length) * 58 : 20;
  const techScore = tech.length ? Math.min(22, (techHits / tech.length) * 22) : 10;
  const experienceScore = exp === 'Advanced' ? 15 : exp === 'Intermediate' ? 10 : 5;
  const workloadPenalty = Math.min(20, currentAssignedHours * 0.8);

  return Math.max(1, Math.min(99, Math.round(skillScore + techScore + experienceScore - workloadPenalty)));
};

const chooseOwner = (members, task, memberHours) => {
  const scored = members
    .map(member => ({
      member,
      score: calculateCompatibility(member, task.category, task, memberHours[member.name] || 0)
    }))
    .sort((a, b) => b.score - a.score || (memberHours[a.member.name] || 0) - (memberHours[b.member.name] || 0));

  return scored[0] || { member: members[0], score: 50 };
};

const buildImplementationTasks = (project, members) => {
  const features = (project.featuresToBuild || []).filter(Boolean);
  const tasks = [];
  const idsByCategory = {};

  features.forEach(feature => {
    TASK_CATEGORIES.forEach(category => {
      const taskName = taskNameFor(feature, category);
      const taskId = stableId([feature, category, taskName]);
      idsByCategory[`${feature}:${category}`] = taskId;
      tasks.push({
        id: taskId,
        task: taskName,
        taskName,
        featureName: feature,
        epic: feature,
        category,
        priority: ['Database', 'Backend', 'API', 'Testing', 'Deployment'].includes(category) ? 'High' : 'Medium',
        difficulty: ['AI', 'Backend', 'Deployment'].includes(category) ? 'Hard' : category === 'Documentation' ? 'Easy' : 'Medium',
        estimatedHours: DEFAULT_HOURS[category] || 2,
        dependencies: [],
        deliverables: [`Working ${category.toLowerCase()} implementation for ${feature}`],
        suggestedSkills: CATEGORY_SKILLS[category] || [],
        suggestedTechnologies: CATEGORY_TECH[category] || [],
        acceptanceCriteria: [
          `${taskName} is implemented for ${feature}`,
          'Implementation is connected to the existing MERN workflow',
          'Errors, loading states, and edge cases are handled',
          'Task can be demonstrated during judging'
        ],
        status: 'Not Started',
        marketplaceStatus: 'Locked',
        collaborators: [],
        primaryOwner: '',
        contributionHistory: [],
        auditTrail: []
      });
    });
  });

  tasks.forEach(task => {
    task.dependencies = buildDependencies(task.featureName, task.category, idsByCategory);
  });

  return tasks;
};

const buildTaskPlan = ({ project, teamMembers, aiPlan = null, hackathonTimeline = null }) => {
  const members = (teamMembers || []).map(member => ({
    name: member.name,
    skills: member.skills || [],
    experienceLevel: inferExperienceLevel(member),
    preferredTechnologies: member.preferredTechnologies || member.preferredTech || [],
    currentWorkload: member.currentWorkload || 0
  }));

  const safeMembers = members.length > 0 ? members : [{ name: 'Unassigned', skills: [], experienceLevel: 'Beginner', preferredTechnologies: [] }];
  const tasks = buildImplementationTasks(project, safeMembers);
  const memberHours = Object.fromEntries(safeMembers.map(member => [member.name, Number(member.currentWorkload || 0)]));
  const assignments = safeMembers.map(member => ({
    member: member.name,
    skills: member.skills,
    experienceLevel: member.experienceLevel,
    preferredTechnologies: member.preferredTechnologies,
    assignedHours: 0,
    completedHours: 0,
    remainingHours: 0,
    assignedTasks: []
  }));

  tasks.forEach(task => {
    const selected = chooseOwner(safeMembers, task, memberHours);
    const ownerName = selected.member.name;
    task.assignedTo = ownerName;
    task.primaryOwner = ownerName;
    task.compatibilityScore = selected.score;
    task.skillMatch = safeMembers.map(member => ({
      member: member.name,
      score: calculateCompatibility(member, task.category, task, memberHours[member.name] || 0),
      matchedSkills: (member.skills || []).filter(skill =>
        (CATEGORY_SKILLS[task.category] || []).some(required => String(skill).toLowerCase().includes(required))
      )
    })).sort((a, b) => b.score - a.score);
    task.auditTrail.push({
      action: 'Assigned',
      actor: 'AI Task Splitter',
      to: ownerName,
      score: selected.score,
      at: new Date().toISOString()
    });

    memberHours[ownerName] = (memberHours[ownerName] || 0) + task.estimatedHours;
    const assignment = assignments.find(item => item.member === ownerName);
    assignment.assignedTasks.push(task);
    assignment.assignedHours += task.estimatedHours;
    assignment.remainingHours += task.estimatedHours;
  });

  const totalHours = assignments.reduce((sum, item) => sum + item.assignedHours, 0);
  const workloadDistribution = assignments.map(item => ({
    member: item.member,
    percentage: totalHours > 0 ? Math.round((item.assignedHours / totalHours) * 100) : 0,
    assignedHours: item.assignedHours,
    completedHours: item.completedHours,
    remainingHours: item.remainingHours
  }));

  const dependencyGraph = {
    nodes: tasks.map(task => ({
      id: task.id,
      label: task.taskName,
      featureName: task.featureName,
      category: task.category,
      owner: task.assignedTo,
      status: task.status
    })),
    edges: tasks.flatMap(task => task.dependencies.map(dep => ({ from: dep, to: task.id })))
  };

  const epics = (project.featuresToBuild || []).map(feature => {
    const featureTasks = tasks.filter(task => task.featureName === feature);
    return {
      epic: feature,
      featureName: feature,
      totalTasks: featureTasks.length,
      estimatedHours: featureTasks.reduce((sum, task) => sum + task.estimatedHours, 0),
      categories: TASK_CATEGORIES,
      taskIds: featureTasks.map(task => task.id)
    };
  });

  const criticalTasks = tasks
    .filter(task => ['Database', 'Backend', 'API', 'Testing', 'Deployment'].includes(task.category))
    .map(task => task.task);

  const recommendations = buildExecutionRecommendations(assignments);

  return {
    ...(aiPlan || {}),
    projectTasks: {
      coreFeatures: project.featuresToBuild || [],
      technicalTasks: tasks.filter(task => ['Backend', 'Database', 'API', 'AI'].includes(task.category)).map(task => task.task),
      deploymentTasks: tasks.filter(task => task.category === 'Deployment').map(task => task.task)
    },
    epics,
    assignments,
    workloadDistribution,
    executionOrder: dependencyGraph.nodes.map(node => node.label),
    dependencyGraph,
    criticalTasks,
    criticalPath: dependencyGraph.edges,
    recommendedFocus: recommendations,
    warnings: recommendations.filter(item => item.toLowerCase().includes('risk') || item.toLowerCase().includes('overload')),
    milestones: epics.map(epic => ({
      name: `${epic.featureName} implementation`,
      tasks: epic.taskIds,
      estimatedHours: epic.estimatedHours
    })),
    deliverables: tasks.map(task => task.deliverables[0]),
    marketplace: {
      requests: [],
      history: [],
      activityLog: [],
      recommendations
    },
    executionMetrics: {
      totalEstimatedHours: totalHours,
      totalTasks: tasks.length,
      totalEpics: epics.length,
      generatedAt: new Date().toISOString(),
      hackathonTimeline
    }
  };
};

const buildExecutionRecommendations = (assignments = []) => {
  if (!assignments.length) return [];

  const hours = assignments.map(item => item.assignedHours || 0);
  const max = Math.max(...hours);
  const min = Math.min(...hours);
  const overloaded = assignments.find(item => item.assignedHours === max);
  const idle = assignments.find(item => item.assignedHours === min);
  const recs = [];

  if (max - min > 5 && overloaded && idle) {
    recs.push(`Workload risk: ${overloaded.member} has ${max}h while ${idle.member} has ${min}h. Consider collaboration or reassignment.`);
  }

  assignments.forEach(assignment => {
    const aiTasks = (assignment.assignedTasks || []).filter(task => task.category === 'AI');
    if (aiTasks.length > 2) {
      recs.push(`${assignment.member} owns several AI tasks. Add a reviewer for schema validation and fallback checks.`);
    }
  });

  if (recs.length === 0) {
    recs.push('Workload and skill distribution look balanced. Start with database and backend prerequisites before frontend integration.');
  }

  return recs;
};

const recalculateTaskPlanMetrics = (taskPlan) => {
  if (!taskPlan?.assignments) return taskPlan;

  taskPlan.assignments.forEach(assignment => {
    let assignedHours = 0;
    let completedHours = 0;
    let remainingHours = 0;

    (assignment.assignedTasks || []).forEach(task => {
      const hours = Number(task.estimatedHours || 0);
      assignedHours += hours;
      if (task.status === 'Completed') {
        completedHours += hours;
      } else {
        remainingHours += hours;
      }
    });

    assignment.assignedHours = assignedHours;
    assignment.completedHours = completedHours;
    assignment.remainingHours = remainingHours;
  });

  const totalHours = taskPlan.assignments.reduce((sum, item) => sum + (item.assignedHours || 0), 0);
  taskPlan.workloadDistribution = taskPlan.assignments.map(item => ({
    member: item.member,
    percentage: totalHours > 0 ? Math.round(((item.assignedHours || 0) / totalHours) * 100) : 0,
    assignedHours: item.assignedHours || 0,
    completedHours: item.completedHours || 0,
    remainingHours: item.remainingHours || 0
  }));

  taskPlan.marketplace = taskPlan.marketplace || {};
  taskPlan.marketplace.recommendations = buildExecutionRecommendations(taskPlan.assignments);
  taskPlan.executionMetrics = {
    ...(taskPlan.executionMetrics || {}),
    totalEstimatedHours: totalHours,
    totalTasks: taskPlan.assignments.reduce((sum, item) => sum + ((item.assignedTasks || []).length), 0),
    recalculatedAt: new Date().toISOString()
  };

  return taskPlan;
};

module.exports = {
  TASK_CATEGORIES,
  buildTaskPlan,
  recalculateTaskPlanMetrics,
  calculateCompatibility,
  buildExecutionRecommendations
};
