/**
 * Repository Health Service
 * ==========================
 * Redone as an Advanced Repository Intelligence System.
 * Calculates health scores, branch hygiene, contributor activity,
 * commit metrics, PR analysis, issues, features vs github alignment,
 * team consistency, and risk factors.
 */

/**
 * Determine if commits were made in the last N hours.
 */
const hasRecentCommits = (commits, hours = 24) => {
  if (!commits || commits.length === 0) return false;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return commits.some(c => {
    const d = c?.commit?.author?.date || c?.commit?.committer?.date;
    return d && new Date(d).getTime() > cutoff;
  });
};

/**
 * Count commits in the last N days.
 */
const commitsInLastDays = (commits, days = 7) => {
  if (!commits || commits.length === 0) return 0;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return commits.filter(c => {
    const d = c?.commit?.author?.date || c?.commit?.committer?.date;
    return d && new Date(d).getTime() > cutoff;
  }).length;
};

const hasDeploymentConfig = (tree) => {
  const deployPatterns = [
    'dockerfile', 'docker-compose', 'heroku', 'vercel', 'netlify',
    'render', 'fly.toml', '.github/workflows', 'k8s', 'kubernetes',
    'buildspec', 'appspec', 'procfile', 'app.yaml', 'serverless'
  ];
  const names = (tree || []).map(f => (f.path || '').toLowerCase());
  return deployPatterns.some(p => names.some(n => n.includes(p)));
};

const hasTestFiles = (tree) => {
  const testPatterns = [
    'test', 'spec', 'jest', 'vitest', 'cypress', 'playwright',
    '__tests__', '.test.', '.spec.', 'testing'
  ];
  const names = (tree || []).map(f => (f.path || '').toLowerCase());
  return testPatterns.some(p => names.some(n => n.includes(p)));
};

/**
 * Redesigned Intelligence Calculations Engine
 */
const calculateRepositoryIntelligence = (project, cachedData, hackConfig) => {
  const result = {
    healthScore: 0,
    healthStatus: 'Poor',
    healthBreakdown: {},
    contributorIntelligence: [],
    featureRealityCheck: [],
    commitIntelligence: {},
    branchIntelligence: {},
    pullRequestAnalysis: {},
    issueAnalysis: {},
    teamConsistencyScore: 100,
    riskDetections: []
  };

  if (!cachedData) {
    return result;
  }

  const {
    commits = [],
    pullRequests = [],
    issues = [],
    branches = [],
    contributors = [],
    hasReadme = false,
    tree = [],
    workflows = []
  } = cachedData;

  // 1. Calculate Repository Health (Breakdown)
  let score = 0;
  const breakdown = {};

  // Commit Frequency (max 15)
  const weekCommits = commitsInLastDays(commits, 7);
  let commitFreqScore = 0;
  if (weekCommits >= 10) commitFreqScore = 15;
  else if (weekCommits >= 3) commitFreqScore = 10;
  else if (weekCommits > 0) commitFreqScore = 5;
  score += commitFreqScore;
  breakdown.commitFrequency = { score: commitFreqScore, max: 15, details: `${weekCommits} commits in the last 7 days` };

  // Pull Request Activity (max 15)
  const openPRs = pullRequests.filter(p => p.state === 'open');
  const openPRCount = openPRs.length;
  const closedPRCount = pullRequests.filter(p => p.state === 'closed').length;
  const totalPRCount = pullRequests.length;
  let prActivityScore = 0;
  if (totalPRCount >= 5) prActivityScore = 15;
  else if (totalPRCount >= 2) prActivityScore = 10;
  else if (totalPRCount > 0) prActivityScore = 5;
  score += prActivityScore;
  breakdown.pullRequestActivity = { score: prActivityScore, max: 15, details: `${totalPRCount} total pull requests (${openPRCount} open, ${closedPRCount} closed)` };

  // Merge Success Rate (max 15)
  const mergedPRs = pullRequests.filter(p => p.state === 'closed' && p.merged_at).length;
  const mergeRate = totalPRCount > 0 ? (mergedPRs / totalPRCount) * 100 : 100; // default 100% if no PRs
  let mergeRateScore = 15;
  if (totalPRCount > 0) {
    if (mergeRate >= 80) mergeRateScore = 15;
    else if (mergeRate >= 50) mergeRateScore = 10;
    else if (mergeRate >= 20) mergeRateScore = 5;
    else mergeRateScore = 2;
  }
  score += mergeRateScore;
  breakdown.mergeSuccessRate = { score: mergeRateScore, max: 15, details: `${mergedPRs} merged out of ${totalPRCount} PRs (${Math.round(mergeRate)}% success rate)` };

  // Open Issues (max 10)
  const openIssuesCount = issues.filter(i => i.state === 'open').length;
  let issueScore = 0;
  if (openIssuesCount <= 2) issueScore = 10;
  else if (openIssuesCount <= 5) issueScore = 8;
  else if (openIssuesCount <= 10) issueScore = 5;
  else issueScore = 2;
  score += issueScore;
  breakdown.openIssues = { score: issueScore, max: 10, details: `${openIssuesCount} active open issues` };

  // Branch Hygiene (max 15)
  let branchHygieneScore = 15;
  if (branches.length > 5) branchHygieneScore = 10;
  else if (branches.length > 1) branchHygieneScore = 15;
  else branchHygieneScore = 5; // too few branches
  score += branchHygieneScore;
  breakdown.branchHygiene = { score: branchHygieneScore, max: 15, details: `${branches.length} branches tracked` };

  // Code Review Activity (max 10)
  const hasMultipleReviewers = pullRequests.some(p => p.requested_reviewers?.length > 0 || p.draft === false);
  let reviewScore = hasMultipleReviewers ? 10 : 5;
  score += reviewScore;
  breakdown.codeReviewActivity = { score: reviewScore, max: 10, details: hasMultipleReviewers ? 'Reviewers active on pull requests' : 'Limited peer code reviews detected' };

  // Active Contributors (max 10)
  let contributorScore = 0;
  if (contributors.length >= 3) contributorScore = 10;
  else if (contributors.length >= 2) contributorScore = 7;
  else if (contributors.length === 1) contributorScore = 4;
  score += contributorScore;
  breakdown.activeContributors = { score: contributorScore, max: 10, details: `${contributors.length} active contributor(s)` };

  // Recent Activity (max 10)
  let recentScore = 0;
  if (hasRecentCommits(commits, 24)) recentScore = 10;
  else if (hasRecentCommits(commits, 72)) recentScore = 6;
  else if (weekCommits > 0) recentScore = 3;
  score += recentScore;
  breakdown.recentActivity = { score: recentScore, max: 10, details: hasRecentCommits(commits, 24) ? 'Commits pushed in last 24 hours' : 'No commits in last 24 hours' };

  result.healthScore = Math.min(100, Math.max(0, score));
  if (result.healthScore >= 85) result.healthStatus = 'Excellent';
  else if (result.healthScore >= 65) result.healthStatus = 'Healthy';
  else if (result.healthScore >= 40) result.healthStatus = 'Needs Attention';
  else result.healthStatus = 'Critical';
  result.healthBreakdown = breakdown;


  // 2. Contributor Intelligence (Compare GitHub vs assigned tasks)
  const assignments = project?.taskPlan?.assignments || [];
  const memberTasksMap = {};
  assignments.forEach(a => {
    const memberName = a.member.toLowerCase();
    memberTasksMap[memberName] = {
      assigned: a.assignedTasks?.length || 0,
      completed: a.assignedTasks?.filter(t => t.status === 'Completed').length || 0,
      taskList: a.assignedTasks || []
    };
  });

  // Calculate commit count and PR count per contributor
  const contributorStats = {};
  // Initialize with team members
  assignments.forEach(a => {
    contributorStats[a.member] = {
      name: a.member,
      commits: 0,
      openPRs: 0,
      mergedPRs: 0,
      lastCommitDate: null,
      inactiveDays: 99
    };
  });

  // Build a fuzzy name-matching helper
  const tokenize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);

  const namesMatch = (memberName, authorName, authorLogin) => {
    const memberTokens = tokenize(memberName);
    const authorTokens = tokenize(authorName);
    const loginTokens = tokenize(authorLogin);

    // Exact match (case-insensitive)
    if (memberName.toLowerCase() === authorName.toLowerCase()) return true;
    if (memberName.toLowerCase() === authorLogin.toLowerCase()) return true;

    // Author login contains member first name or vice versa
    const memberFirst = memberTokens[0] || '';
    const memberLast = memberTokens[memberTokens.length - 1] || '';
    const loginNorm = (authorLogin || '').toLowerCase();

    if (memberFirst.length > 2 && loginNorm.includes(memberFirst)) return true;
    if (memberLast.length > 2 && loginNorm.includes(memberLast)) return true;

    // Token overlap: at least one shared significant token
    const authorAllTokens = [...authorTokens, ...loginTokens];
    const sharedTokens = memberTokens.filter(t => t.length > 2 && authorAllTokens.some(at => at.includes(t) || t.includes(at)));
    if (sharedTokens.length > 0) return true;

    // Member full name is a substring of author name or vice versa
    if (authorName.toLowerCase().includes(memberFirst) && memberFirst.length > 2) return true;
    if (memberName.toLowerCase().includes(tokenize(authorName)[0] || '') && (tokenize(authorName)[0] || '').length > 2) return true;

    return false;
  };

  // Tallies from commits
  const memberKeys = Object.keys(contributorStats);
  const sampleAuthors = commits.slice(0, 5).map(c => ({ name: c?.commit?.author?.name, login: c?.author?.login }));
  console.log('[ContributorMatch] Team member names:', memberKeys);
  console.log('[ContributorMatch] Sample commit authors:', JSON.stringify(sampleAuthors));

  commits.forEach(c => {
    const authorName = c?.commit?.author?.name || '';
    const authorLogin = c?.author?.login || '';

    let matchedMember = Object.keys(contributorStats).find(mName =>
      namesMatch(mName, authorName, authorLogin)
    );

    if (matchedMember) {
      contributorStats[matchedMember].commits++;
      const cDate = new Date(c?.commit?.author?.date);
      if (!contributorStats[matchedMember].lastCommitDate || cDate > contributorStats[matchedMember].lastCommitDate) {
        contributorStats[matchedMember].lastCommitDate = cDate;
      }
    }
  });

  // Tallies from PRs
  pullRequests.forEach(p => {
    const prAuthor = p.user?.login || '';
    const prAuthorName = p.user?.name || '';
    let matchedMember = Object.keys(contributorStats).find(mName =>
      namesMatch(mName, prAuthorName, prAuthor)
    );

    if (matchedMember) {
      if (p.state === 'open') {
        contributorStats[matchedMember].openPRs++;
      } else if (p.state === 'closed' && p.merged_at) {
        contributorStats[matchedMember].mergedPRs++;
      }
    }
  });

  // Enrich inactive days and comparisons
  const now = new Date();
  result.contributorIntelligence = Object.values(contributorStats).map(c => {
    const tasks = memberTasksMap[c.name.toLowerCase()] || { assigned: 0, completed: 0, taskList: [] };
    c.assignedTasksCount = tasks.assigned;
    c.completedTasksCount = tasks.completed;

    if (c.lastCommitDate) {
      const diffTime = Math.abs(now - c.lastCommitDate);
      c.inactiveDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      c.inactiveDays = 99; // never committed
    }

    // Generate comparison verdict
    let verdict = 'Healthy';
    let summary = `${c.name} is active in the repository with ${c.commits} commits.`;

    if (c.assignedTasksCount > 0 && c.commits === 0) {
      verdict = 'Inconsistent';
      summary = `${c.name} has ${c.assignedTasksCount} assigned tasks but no repository commits.`;
      result.riskDetections.push({
        type: 'Inactive Contributor',
        message: `⚠️ Contributor ${c.name} has ${c.assignedTasksCount} assigned tasks but 0 commits in the repository.`,
        severity: 'High'
      });
    } else if (c.completedTasksCount > 0 && c.commits <= 1) {
      verdict = 'Low Activity';
      summary = `${c.name} completed ${c.completedTasksCount} tasks but has only ${c.commits} commit.`;
      result.riskDetections.push({
        type: 'Low Repository Activity',
        message: `⚠️ ${c.name} marked ${c.completedTasksCount} tasks complete, but has only ${c.commits} commit.`,
        severity: 'Medium'
      });
    } else if (c.inactiveDays > 3 && c.assignedTasksCount > c.completedTasksCount) {
      verdict = 'Stalled';
      summary = `${c.name} has unfinished tasks and has been inactive in GitHub for ${c.inactiveDays} days.`;
      result.riskDetections.push({
        type: 'Contributor Stalled',
        message: `⚠️ ${c.name} has uncompleted work and has not made a commit in ${c.inactiveDays} days.`,
        severity: 'Medium'
      });
    }

    return {
      ...c,
      verdict,
      comparisonSummary: summary
    };
  });


  // 3. Feature vs GitHub Reality Check
  const featureTasks = {};
  
  // Group tasks by features/epics
  assignments.forEach(a => {
    (a.assignedTasks || []).forEach(t => {
      const feat = t.epic || t.featureName || 'General';
      if (!featureTasks[feat]) featureTasks[feat] = { total: 0, completed: 0, tasks: [] };
      featureTasks[feat].total++;
      if (t.status === 'Completed') featureTasks[feat].completed++;
      featureTasks[feat].tasks.push(t.task);
    });
  });

  result.featureRealityCheck = Object.entries(featureTasks).map(([featureName, stats]) => {
    const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    
    // Scan commits for feature terms
    const keywords = featureName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchedCommits = commits.filter(c => {
      const msg = (c.commit?.message || '').toLowerCase();
      return keywords.some(kw => msg.includes(kw));
    });

    let verdict = 'Aligned';
    let reasoning = `GitHub commit volume (${matchedCommits.length} commits) aligns with the stated feature progress (${progressPercent}%).`;

    if (progressPercent >= 70 && matchedCommits.length <= 1) {
      verdict = 'Inconsistent';
      reasoning = `⚠️ Feature is marked ${progressPercent}% complete, but only ${matchedCommits.length} matching commit was found. Verification required.`;
      result.riskDetections.push({
        type: 'Feature Inconsistency',
        message: `⚠️ Feature "${featureName}" is marked ${progressPercent}% complete, but has only ${matchedCommits.length} commits.`,
        severity: 'High'
      });
    } else if (progressPercent === 0 && matchedCommits.length > 2) {
      verdict = 'Ahead';
      reasoning = `GitHub activity shows ${matchedCommits.length} commits for this feature, but progress is marked 0%. Consider updating progress.`;
    }

    return {
      featureName,
      progressPercent,
      commitCount: matchedCommits.length,
      verdict,
      reasoning,
      tasks: stats.tasks
    };
  });


  // 4. Commit Intelligence (Frequencies, sizing, timings, inactivity)
  const commitMessages = commits.map(c => c.commit?.message || '');
  const commitSizes = commitMessages.map(m => m.length);
  const avgCommitSize = commitSizes.length > 0 ? Math.round(commitSizes.reduce((a, b) => a + b, 0) / commitSizes.length) : 0;

  // Commit Timings (hour of day)
  const hours = commits.map(c => {
    const d = c?.commit?.author?.date;
    return d ? new Date(d).getHours() : null;
  }).filter(h => h !== null);

  const hourlyDistribution = Array(24).fill(0);
  hours.forEach(h => hourlyDistribution[h]++);

  // Detect patterns
  const activeDays = new Set(commits.map(c => {
    const d = c?.commit?.author?.date;
    return d ? d.slice(0, 10) : null;
  }).filter(Boolean));

  let commitPattern = 'Steady';
  const commitsPerActiveDay = activeDays.size > 0 ? commits.length / activeDays.size : 0;

  // Detect inactivity periods
  let maxInactivityHours = 0;
  if (commits.length >= 2) {
    for (let i = 0; i < commits.length - 1; i++) {
      const d1 = new Date(commits[i].commit.author.date);
      const d2 = new Date(commits[i+1].commit.author.date);
      const diffHours = Math.abs(d1 - d2) / (1000 * 60 * 60);
      if (diffHours > maxInactivityHours) {
        maxInactivityHours = diffHours;
      }
    }
  }

  if (maxInactivityHours > 48) {
    commitPattern = 'Irregular Bursts';
  } else if (commitsPerActiveDay > 8) {
    commitPattern = 'High Volume Bursts';
  } else if (commits.length > 0) {
    commitPattern = 'Healthy Consistent Timelines';
  } else {
    commitPattern = 'No Activity';
  }

  result.commitIntelligence = {
    totalCommits: commits.length,
    commitsPerActiveDay: Math.round(commitsPerActiveDay * 10) / 10,
    averageCommitSizeChars: avgCommitSize,
    commitPattern,
    inactivePeriodHours: Math.round(maxInactivityHours),
    hourlyDistribution
  };


  // 5. Branch Intelligence
  const branchList = [];

  branches.forEach(b => {
    branchList.push({
      name: b.name,
      isDefault: b.name === (cachedData.repoInfo?.default_branch || 'main'),
      status: 'Active'
    });
  });

  const staleBranchesList = branchList.filter(b => b.status === 'Stale');
  const recommendations = [];
  if (branchList.length > 5) {
    recommendations.push(`Clean up stale branches (e.g. merge and delete old feature branches).`);
  }
  if (branchList.length === 1) {
    recommendations.push(`Adopt a feature branching strategy (e.g. avoid pushing directly to main branch).`);
  }

  result.branchIntelligence = {
    totalBranches: branches.length,
    activeBranches: branchList.filter(b => b.status === 'Active').map(b => b.name),
    staleBranches: staleBranchesList.map(b => b.name),
    recommendations
  };


  // 6. Pull Request Analysis
  const mergedPRsList = pullRequests.filter(p => p.state === 'closed' && p.merged_at);
  let totalMergeTimeHrs = 0;
  mergedPRsList.forEach(pr => {
    const created = new Date(pr.created_at);
    const merged = new Date(pr.merged_at);
    totalMergeTimeHrs += Math.abs(merged - created) / (1000 * 60 * 60);
  });
  const avgMergeTimeHours = mergedPRsList.length > 0 ? Math.round(totalMergeTimeHrs / mergedPRsList.length) : 0;

  // Detect PR bottlenecks
  const bottlenecks = [];
  openPRs.forEach(pr => {
    const created = new Date(pr.created_at);
    const openHours = Math.abs(now - created) / (1000 * 60 * 60);
    if (openHours > 48) {
      bottlenecks.push(`PR #${pr.number} ("${pr.title}") has been open for ${Math.round(openHours / 24)} days.`);
      result.riskDetections.push({
        type: 'Long-running PR',
        message: `⚠️ PR #${pr.number} has been open and unmerged for ${Math.round(openHours / 24)} days.`,
        severity: 'Medium'
      });
    }
  });

  result.pullRequestAnalysis = {
    openPRCount: openPRCount,
    mergedPRCount: mergedPRsList.length,
    rejectedPRCount: pullRequests.filter(p => p.state === 'closed' && !p.merged_at).length,
    avgMergeTimeHours,
    pendingReviewsCount: openPRs.filter(p => p.requested_reviewers?.length > 0).length,
    bottlenecks
  };


  // 7. Issue Analysis
  const openIssuesList = issues.filter(i => i.state === 'open');
  const closedIssuesList = issues.filter(i => i.state === 'closed');
  
  // Find critical issues
  const criticalIssues = openIssuesList.filter(i => {
    const titleLower = i.title.toLowerCase();
    const labels = (i.labels || []).map(l => l.name.toLowerCase());
    return titleLower.includes('bug') || titleLower.includes('critical') || titleLower.includes('error') ||
      labels.some(l => l.includes('bug') || l.includes('critical') || l.includes('high') || l.includes('blocked'));
  });

  criticalIssues.forEach(ci => {
    result.riskDetections.push({
      type: 'Critical Issue Open',
      message: `⚠️ Unresolved critical issue: #${ci.number} "${ci.title}"`,
      severity: 'High'
    });
  });

  result.issueAnalysis = {
    openIssues: openIssuesList.length,
    resolvedIssues: closedIssuesList.length,
    criticalIssuesCount: criticalIssues.length,
    staleIssuesCount: openIssuesList.filter(i => {
      const created = new Date(i.created_at);
      const daysOpen = Math.abs(now - created) / (1000 * 60 * 60 * 24);
      return daysOpen > 3;
    }).length
  };


  // 8. Team Consistency Score (claimed progress vs git contributions)
  let penalty = 0;
  result.contributorIntelligence.forEach(c => {
    if (c.verdict === 'Inconsistent') penalty += 20;
    else if (c.verdict === 'Low Activity') penalty += 10;
    else if (c.verdict === 'Stalled') penalty += 5;
  });

  result.featureRealityCheck.forEach(f => {
    if (f.verdict === 'Inconsistent') penalty += 15;
  });

  result.teamConsistencyScore = Math.max(0, 100 - penalty);

  return result;
};

// --- Backward Compatibility Helper Functions ---

const calculateRepositoryHealth = (cachedData) => {
  if (!cachedData) return { score: 0, status: 'Unknown', indicators: {} };
  const intel = calculateRepositoryIntelligence(null, cachedData, null);
  return {
    score: intel.healthScore,
    status: intel.healthStatus,
    indicators: {
      commitActivity: intel.healthBreakdown.commitFrequency?.details || '',
      branchActivity: intel.branchIntelligence.activeBranches?.length > 1 ? 'Feature branching' : 'Single branch only',
      issueStatus: intel.healthBreakdown.openIssues?.details || '',
      pullRequestStatus: intel.healthBreakdown.pullRequestActivity?.details || '',
      readme: cachedData.hasReadme ? 'README present' : 'README missing',
      testing: hasTestFiles(cachedData.tree) ? 'Tests found' : 'No tests detected',
      deployment: hasDeploymentConfig(cachedData.tree) ? 'Deployment config found' : 'No deployment config',
      cicd: (cachedData.workflows || []).length > 0 ? 'Workflows active' : 'No CI/CD workflows'
    }
  };
};

const commitsToday = (commits) => {
  if (!commits || commits.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  return commits.filter(c => {
    const d = c?.commit?.author?.date || '';
    return d.startsWith(today);
  }).length;
};

const buildCommitSummary = (commits) => {
  if (!commits || commits.length === 0) {
    return {
      totalFetched: 0,
      commitsToday: 0,
      last7Days: 0,
      lastCommitAt: null,
      lastCommitMessage: null,
      lastCommitAuthor: null,
      topAuthors: []
    };
  }

  const authorCounts = {};
  (commits || []).forEach(c => {
    const author = c?.commit?.author?.name || c?.author?.login || 'Unknown';
    authorCounts[author] = (authorCounts[author] || 0) + 1;
  });

  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const latestCommit = commits[0];
  return {
    totalFetched: commits.length,
    commitsToday: commitsToday(commits),
    last7Days: commitsInLastDays(commits, 7),
    lastCommitAt: latestCommit?.commit?.author?.date || null,
    lastCommitMessage: latestCommit?.commit?.message?.split('\n')[0] || null,
    lastCommitAuthor: latestCommit?.commit?.author?.name || null,
    topAuthors
  };
};

const buildContributorActivity = (contributors, commits) => {
  if (!contributors || contributors.length === 0) return [];

  const activityMap = {};

  (commits || []).forEach(commit => {
    const author = commit?.commit?.author?.name || commit?.author?.login || 'Unknown';
    const login = commit?.author?.login || author;
    const date = commit?.commit?.author?.date || '';

    if (!activityMap[login]) {
      activityMap[login] = {
        login,
        name: author,
        commits: 0,
        lastActive: null,
        recentCommits: 0
      };
    }

    activityMap[login].commits++;

    if (!activityMap[login].lastActive || date > activityMap[login].lastActive) {
      activityMap[login].lastActive = date;
    }

    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    if (date && new Date(date).getTime() > cutoff24h) {
      activityMap[login].recentCommits++;
    }
  });

  return contributors.map(c => {
    const activity = activityMap[c.login] || {};
    return {
      login: c.login,
      avatar: c.avatar_url || null,
      profileUrl: c.html_url || null,
      commits: c.contributions || activity.commits || 0,
      lastActive: activity.lastActive || null,
      recentCommits: activity.recentCommits || 0,
      isActive: !!activity.lastActive && (Date.now() - new Date(activity.lastActive).getTime()) < 7 * 24 * 60 * 60 * 1000
    };
  });
};

const generateRepositoryAlerts = (cachedData, healthIndicators) => {
  const alerts = [];
  const {
    commits = [],
    hasReadme = false,
    tree = [],
    issues = []
  } = cachedData || {};

  if (!hasRecentCommits(commits, 48)) {
    alerts.push({ message: '⚠️ No commits in the last 48 hours. Development may have stalled.', severity: 'High' });
  }

  if (!hasReadme) {
    alerts.push({ message: '📄 README is missing. Add documentation before submission.', severity: 'Medium' });
  }

  if (!hasTestFiles(tree)) {
    alerts.push({ message: '🧪 No test files detected. Testing not started.', severity: 'Medium' });
  }

  if (!hasDeploymentConfig(tree)) {
    alerts.push({ message: '🚀 No deployment configuration found. Deployment planning required.', severity: 'High' });
  }

  const openIssues = issues.filter(i => i.state === 'open').length;
  if (openIssues > 10) {
    alerts.push({ message: `🐛 ${openIssues} open issues detected. Too many unresolved issues.`, severity: 'High' });
  }

  return alerts;
};

module.exports = {
  calculateRepositoryHealth,
  buildContributorActivity,
  buildCommitSummary,
  generateRepositoryAlerts,
  commitsToday,
  commitsInLastDays,
  hasRecentCommits,
  hasDeploymentConfig,
  hasTestFiles,
  calculateRepositoryIntelligence
};
