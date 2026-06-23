require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const Team = require('./models/Team');
const User = require('./models/User');
const HackathonConfig = require('./models/HackathonConfig');
const Notification = require('./models/Notification');
const TaskMarketplaceRequest = require('./models/TaskMarketplaceRequest');
const { analyzeHackathonCommandCenterWithAI } = require('./services/aiService');

const isSameUser = (id1, id2) => {
  const s1 = id1 && id1._id ? id1._id.toString() : (id1 ? id1.toString() : '');
  const s2 = id2 && id2._id ? id2._id.toString() : (id2 ? id2.toString() : '');
  return s1 === s2;
};

const determineProjectPhase = (config, totalTasks, completedTasks, testingProgress, deploymentProgress, presentationProgress) => {
  if (!config) return 'Planning';
  const now = new Date();
  if (now >= config.endTime) return 'Completed';

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const diffMs = config.endTime - now;
  const hoursRemaining = diffMs / 3600000;

  if (hoursRemaining <= 1.5 || presentationProgress > 30) return 'Presentation';
  if (hoursRemaining <= 4 || deploymentProgress > 30) return 'Deployment';
  if (testingProgress > 30) return 'Testing';
  if (completionPercentage > 0 || now >= config.startTime) return 'Development';
  return 'Planning';
};

const detectDependencyRisks = (assignments) => {
  const allTasks = [];
  assignments.forEach(assign => {
    (assign.assignedTasks || []).forEach(t => {
      allTasks.push({
        name: t.task,
        status: t.status,
        member: assign.member,
        isBlocked: t.status === 'Blocked'
      });
    });
  });

  const risks = [];
  const dbBlocked = allTasks.some(t => t.name.toLowerCase().match(/(database|schema|mongodb|postgres|sql)/) && t.isBlocked);
  const dbIncomplete = allTasks.some(t => t.name.toLowerCase().match(/(database|schema|mongodb|postgres|sql)/) && t.status !== 'Completed');
  const authBlocked = allTasks.some(t => t.name.toLowerCase().match(/(auth|login|signup|jwt)/) && t.isBlocked);
  const authIncomplete = allTasks.some(t => t.name.toLowerCase().match(/(auth|login|signup|jwt)/) && t.status !== 'Completed');
  const apiBlocked = allTasks.some(t => t.name.toLowerCase().match(/(api|endpoint|controller|backend)/) && t.isBlocked);
  const apiIncomplete = allTasks.some(t => t.name.toLowerCase().match(/(api|endpoint|controller|backend)/) && t.status !== 'Completed');

  if (dbBlocked) risks.push("Database/Schema setup is BLOCKED.");
  else if (dbIncomplete && allTasks.some(t => t.name.toLowerCase().match(/(api|endpoint|controller)/) && t.status === 'In Progress')) {
    risks.push("Database schema is incomplete while Backend APIs are in progress.");
  }
  if (authBlocked) risks.push("Authentication setup is BLOCKED.");
  if (apiBlocked) risks.push("Backend API endpoints are BLOCKED.");
  else if (apiIncomplete && allTasks.some(t => t.name.toLowerCase().match(/(frontend|ui|page|integration)/) && t.status === 'In Progress')) {
    risks.push("Backend APIs are incomplete while Frontend UI integration is in progress.");
  }
  return risks;
};

const getProjectStateToken = (project, config, timeMilestone) => {
  let taskKeys = [];
  let taskStatuses = [];
  if (project.taskPlan && project.taskPlan.assignments) {
    project.taskPlan.assignments.forEach(assign => {
      (assign.assignedTasks || []).forEach(t => {
        taskKeys.push(t.task);
        taskStatuses.push(`${t.status}:${t.marketplaceStatus}`);
      });
    });
  }
  const stateObj = {
    projectName: project.projectName,
    techStack: JSON.stringify(project.finalTechStack),
    config: config ? `${config.hackathonName}:${config.startTime}:${config.endTime}:${config.status}` : 'no_config',
    timeMilestone,
    totalTasks: taskKeys.length,
    completedTasks: taskStatuses.filter(s => s.startsWith('Completed:')).length,
    blockedTasks: taskStatuses.filter(s => s.startsWith('Blocked:')).length,
    taskKeys: taskKeys.sort().join(','),
    taskStatuses: taskStatuses.join(',')
  };
  return JSON.stringify(stateObj);
};

async function testDashboard() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const projects = await Project.find();
  console.log(`Total projects in DB: ${projects.length}`);
  for (const proj of projects) {
    const t = await Team.findById(proj.teamId);
    console.log(`Project: "${proj.projectName}" (_id: ${proj._id}), teamId: ${proj.teamId}, Team found: ${!!t}`);
  }

  let project;
  for (const proj of projects) {
    const t = await Team.findById(proj.teamId);
    const c = await HackathonConfig.findOne({ projectId: proj._id });
    if (t && c) {
      project = proj;
      break;
    }
  }

  if (!project) {
    console.log('No project with team found');
    mongoose.disconnect();
    return;
  }

  console.log('Found project:', project.projectName, project._id);

  const team = await Team.findById(project.teamId).populate('members', 'name skills avatar');
  if (!team) {
    console.log('No team found');
    mongoose.disconnect();
    return;
  }

  const userId = project.createdBy || team.createdBy;
  console.log('Testing with userId:', userId);

  try {
    let config = await HackathonConfig.findOne({ projectId: project._id });
    if (!config) {
      console.log('Hackathon is not configured yet.');
      mongoose.disconnect();
      return;
    }

    console.log('Found config:', config.hackathonName);

    const now = new Date();
    const diffMs = config.endTime - now;
    const timeRemainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    
    const days = Math.floor(timeRemainingSeconds / (3600 * 24));
    const hours = Math.floor((timeRemainingSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
    const seconds = timeRemainingSeconds % 60;
    
    const isCompleted = timeRemainingSeconds <= 0;

    let timeRemainingStr = '0 hours left';
    if (timeRemainingSeconds > 0) {
      const hoursLeft = Math.floor(timeRemainingSeconds / 3600);
      const minutesLeft = Math.floor((timeRemainingSeconds % 3600) / 60);
      timeRemainingStr = hoursLeft > 0 ? `${hoursLeft} hours, ${minutesLeft} minutes left` : `${minutesLeft} minutes left`;
    }

    const allTasks = [];
    const criticalTasksList = [];
    const highPriorityTasksList = [];
    const optionalTasksList = [];
    const deploymentTasksList = [];
    const testingTasksList = [];
    const presentationTasksList = [];
    const criticalSet = new Set(project.taskPlan?.criticalTasks || []);

    const memberProgress = [];
    const teamWorkloads = {};

    team.members.forEach(m => {
      teamWorkloads[m.name] = { total: 0, completed: 0, pending: 0, blocked: 0 };
    });

    const timelineEvents = [];

    if (project.taskPlan && project.taskPlan.assignments) {
      const assignments = project.taskPlan.assignments;

      assignments.forEach(assign => {
        const mName = assign.member;
        if (!teamWorkloads[mName]) {
          teamWorkloads[mName] = { total: 0, completed: 0, pending: 0, blocked: 0 };
        }

        (assign.assignedTasks || []).forEach(t => {
          allTasks.push(t);
          teamWorkloads[mName].total++;

          const taskName = t.task;
          const text = taskName.toLowerCase();

          if (criticalSet.has(taskName)) criticalTasksList.push(t);

          const isHigh = text.includes('deploy') || text.includes('database') || text.includes('auth') || 
                         text.includes('api') || text.includes('server') || text.includes('routing') || 
                         text.includes('schema') || text.includes('login') || text.includes('security') || 
                         text.includes('cors') || text.includes('jwt') || criticalSet.has(taskName);
          if (isHigh) highPriorityTasksList.push(t);

          const isOptional = text.includes('optional') || text.includes('extra') || text.includes('nice-to-have') || 
                             text.includes('stretch') || text.includes('mock') || text.includes('analytics') || 
                             text.includes('dashboard') || text.includes('graph') || text.includes('chart');
          if (isOptional) optionalTasksList.push(t);

          const isTesting = text.includes('test') || text.includes('spec') || text.includes('unit') || 
                            text.includes('jest') || text.includes('cypress') || text.includes('mocha') || 
                            text.includes('integration') || text.includes('validation');
          if (isTesting) testingTasksList.push(t);

          const isDeployment = text.includes('deploy') || text.includes('vercel') || text.includes('heroku') || 
                               text.includes('aws') || text.includes('docker') || text.includes('host') || 
                               text.includes('environment') || text.includes('env') || text.includes('domain') || 
                               text.includes('setup');
          if (isDeployment) deploymentTasksList.push(t);

          const isPresentation = text.includes('presentation') || text.includes('slide') || text.includes('pitch') || 
                                 text.includes('demo') || text.includes('video') || text.includes('recording') || 
                                 text.includes('script') || text.includes('dry-run');
          if (isPresentation) presentationTasksList.push(t);

          if (t.status === 'Completed') {
            teamWorkloads[mName].completed++;
            timelineEvents.push({
              time: t.updatedAt || project.taskPlanGeneratedAt || new Date(),
              event: `✅ Task Completed: "${t.task}" by ${mName}`,
              type: 'Success'
            });
          } else if (t.status === 'In Progress') {
            teamWorkloads[mName].pending++;
          } else if (t.status === 'Blocked') {
            teamWorkloads[mName].blocked++;
            teamWorkloads[mName].pending++;
          } else {
            teamWorkloads[mName].pending++;
          }
        });
      });
    }

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress').length;
    const blockedTasks = allTasks.filter(t => t.status === 'Blocked').length;
    const pendingTasks = totalTasks - completedTasks;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const getProgressPct = (tasksList) => {
      if (tasksList.length === 0) return 100;
      const completed = tasksList.filter(t => t.status === 'Completed').length;
      return Math.round((completed / tasksList.length) * 100);
    };

    const criticalProgress = getProgressPct(criticalTasksList);
    const highPriorityProgress = getProgressPct(highPriorityTasksList);
    const optionalProgress = getProgressPct(optionalTasksList);
    const deploymentProgress = getProgressPct(deploymentTasksList);
    const testingProgress = getProgressPct(testingTasksList);
    const presentationProgress = getProgressPct(presentationTasksList);

    const criticalTasksTotal = criticalTasksList.length;
    const criticalTasksCompleted = criticalTasksList.filter(t => t.status === 'Completed').length;

    const projectPhase = determineProjectPhase(config, totalTasks, completedTasks, testingProgress, deploymentProgress, presentationProgress);

    let totalPending = 0;
    let idleMembersCount = 0;
    const totalMembers = team.members.length;

    Object.entries(teamWorkloads).forEach(([mName, metrics]) => {
      totalPending += metrics.pending;
      if (metrics.pending === 0) idleMembersCount++;
    });

    const avgPending = totalMembers > 0 ? totalPending / totalMembers : 0;
    let overloadedMembersCount = 0;

    Object.entries(teamWorkloads).forEach(([mName, metrics]) => {
      const workloadPercentage = totalTasks > 0 ? Math.round((metrics.total / totalTasks) * 100) : 0;
      memberProgress.push({
        member: mName,
        ...metrics,
        workloadPercentage
      });

      if (metrics.pending > 4 && metrics.pending > avgPending + 2) {
        overloadedMembersCount++;
      }
    });

    const idleMembersPercentage = totalMembers > 0 ? Math.round((idleMembersCount / totalMembers) * 100) : 0;
    const overloadedMembersPercentage = totalMembers > 0 ? Math.round((overloadedMembersCount / totalMembers) * 100) : 0;

    const dependencyRisks = detectDependencyRisks(project.taskPlan?.assignments || []);

    const hoursRemaining = timeRemainingSeconds / 3600;
    const activeKeys = new Set();
    const currentAlerts = [];
    const nowTime = new Date();

    let reportState = project.commandCenterReport || {};
    let alertsHistory = reportState.alertsHistory || [];

    const checkAlert = (key, isTriggered, baseMessage, checkWhy) => {
      if (!isTriggered) return;
      activeKeys.add(key);
      let hist = alertsHistory.find(h => h.messageKey === key);
      let severity = 'Warning';
      let firstDetected = nowTime;
      if (hist) {
        firstDetected = new Date(hist.firstDetected);
        const elapsedHours = (nowTime - firstDetected) / 3600000;
        if (elapsedHours >= 3) severity = 'Critical';
        else if (elapsedHours >= 1.5) severity = 'High';
        else severity = hist.severity || 'Warning';
        hist.lastDetected = nowTime;
        hist.severity = severity;
      } else {
        alertsHistory.push({
          messageKey: key,
          firstDetected: nowTime,
          lastDetected: nowTime,
          severity: 'Warning'
        });
      }
      let emoji = '🚨';
      if (severity === 'Warning') emoji = '💡';
      else if (severity === 'High') emoji = '⚠️';
      currentAlerts.push({
        message: `${emoji} [${severity}] ${baseMessage} (${checkWhy})`,
        priority: severity,
        key
      });
    };

    const authIncomplete = allTasks.some(t => t.name.toLowerCase().match(/(auth|login|signup|jwt)/) && t.status !== 'Completed');
    checkAlert('auth_incomplete', authIncomplete && hoursRemaining < 24, 'Authentication is incomplete.', 'User login is crucial.');

    let timeMilestone = 'None';
    if (hoursRemaining <= 10/60) timeMilestone = '10m';
    else if (hoursRemaining <= 0.5) timeMilestone = '30m';
    else if (hoursRemaining <= 1) timeMilestone = '1h';
    else if (hoursRemaining <= 3) timeMilestone = '3h';
    else if (hoursRemaining <= 6) timeMilestone = '6h';
    else if (hoursRemaining <= 12) timeMilestone = '12h';
    else if (hoursRemaining <= 24) timeMilestone = '24h';
    else timeMilestone = 'MoreThan24h';

    const currentStateToken = getProjectStateToken(project, config, timeMilestone);
    const marketplaceActivity = await TaskMarketplaceRequest.find({ projectId: project._id });
    const recentNotifications = await Notification.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(10);

    console.log('Calculated token:', currentStateToken);
    console.log('Loading AI analysis...');

    let aiAnalysis = reportState.aiAnalysis || null;
    if (!aiAnalysis || reportState.stateToken !== currentStateToken) {
      console.log('Token mismatch or no cached analysis. Fetching AI...');
    } else {
      console.log('Reusing cached analysis!');
    }

    console.log('SUCCESS! Dashboard loaded.');
  } catch (err) {
    console.error('ERROR during dashboard simulation:', err);
  }

  mongoose.disconnect();
}

testDashboard();
