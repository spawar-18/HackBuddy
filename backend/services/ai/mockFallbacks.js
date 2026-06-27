/**
 * mockFallbacks.js
 * Contains dynamic fallback / mock engines for all 8 AI routines.
 * These extract patterns from input strings to remain context-aware and dynamic.
 */

/**
 * Generates mock team analysis for testing/fallback
 */
const generateMockAnalysis = (teamDataString) => {
  const lines = (teamDataString || '').split('\n');
  const members = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Members:')) continue;
    if (line.startsWith('Team Name:')) continue;
    if (line.startsWith('Skills:')) continue;
    if (line === '') continue;
    
    if (i > 0 && lines[i - 1].trim().startsWith('Skills:')) {
      continue;
    }
    
    if (line && !line.includes(',') && !line.includes(':')) {
      members.push(line);
    }
  }

  const finalMembers = members.length > 0 ? members : ['Sahil'];
  
  const recommendedRoles = finalMembers.map((member) => {
    return {
      member,
      role: 'Full Stack Developer'
    };
  });

  return {
    readinessScore: 8.0,
    strengths: [
      'Frontend Development',
      'Backend Development',
      'Database Architecture'
    ],
    skillGaps: [
      'DevOps & CI/CD',
      'Testing & QA'
    ],
    recommendedRoles
  };
};

/**
 * Generates a dynamic mock project review for fallback/testing.
 * Parses the actual project context string to produce context-aware output.
 */
const generateMockProjectReview = (projectContextString) => {
  const ctx = projectContextString || '';

  // --- Parse key fields from context ---
  const durationMatch = ctx.match(/(?:Planned\s+)?Duration:\s*(\d+)\s*hours?/i) || ctx.match(/Duration:\s*(\d+)/i);
  const hours = durationMatch ? parseInt(durationMatch[1], 10) : 24;

  const projectNameMatch = ctx.match(/Project Name:\s*(.*)/i);
  const projectName = projectNameMatch ? projectNameMatch[1].trim() : 'this project';

  const trackMatch = ctx.match(/Track:\s*(.*)/i);
  const track = trackMatch ? trackMatch[1].trim() : '';

  const problemMatch = ctx.match(/Problem Statement:\s*([\s\S]*?)(?=\n(?:Description|Features|Track|Team|---)|$)/i);
  const problemStatement = problemMatch ? problemMatch[1].trim().substring(0, 150) : '';

  // Extract features from context (handles both "Features to Build:" bullet list style)
  const featuresBlockMatch = ctx.match(/Features to Build:\s*([\s\S]*?)(?=\n(?:Team|---|\n\n)|$)/i);
  let parsedFeatures = [];
  if (featuresBlockMatch) {
    parsedFeatures = featuresBlockMatch[1]
      .split('\n')
      .map(l => l.replace(/^[\s\-*•]+/, '').trim())
      .filter(l => l.length > 2);
  }

  // Extract team members and skills
  const memberLines = [];
  const memberRegex = /[-•]?\s*([A-Za-z][A-Za-z\s]+?)\s*\((?:Role:\s*[^|]+?\|?\s*)?Skills?:\s*([^)]+)\)/gi;
  let memberMatch;
  while ((memberMatch = memberRegex.exec(ctx)) !== null) {
    memberLines.push({ name: memberMatch[1].trim(), skills: memberMatch[2].trim() });
  }

  // Derive must-build features (first 3 features if available)
  const mustBuildFeatures = parsedFeatures.length > 0
    ? parsedFeatures.slice(0, Math.min(3, parsedFeatures.length))
    : ['Core feature implementation', 'User interface', 'API integration'];

  // Derive optional features (remaining features after must-build)
  const optionalFeatures = parsedFeatures.length > 3
    ? parsedFeatures.slice(3, Math.min(6, parsedFeatures.length))
    : ['Advanced analytics', 'Export and reporting tools'];

  // Derive featuresToRemove (anything beyond 6 features is risky in a hackathon)
  const featuresToRemove = parsedFeatures.length > 6
    ? parsedFeatures.slice(6)
    : ['Non-essential integrations not directly tied to the demo flow'];

  // Build problem-solution alignment string based on parsed data
  const psa = problemStatement
    ? `The solution directly addresses: "${problemStatement.substring(0, 100)}...". The feature set is well-aligned but scope must be managed for the ${hours}-hour window.`
    : `The proposed solution aligns with the project goals. The core features address the key pain points, but the technical scope should be reviewed against the ${hours}-hour hackathon duration.`;

  // Extract unique skills from team members
  const allSkills = memberLines.flatMap(m => m.skills.split(/,\s*/)).map(s => s.trim()).filter(Boolean);
  const uniqueSkills = [...new Set(allSkills)];

  // Derive missing skills based on project track
  let missingSkills = ['Cloud infrastructure configuration', 'Production deployment pipeline'];
  if (track.toLowerCase().includes('ai') || track.toLowerCase().includes('ml')) {
    missingSkills = ['ML model optimization', 'GPU resource provisioning'];
  } else if (track.toLowerCase().includes('web') || track.toLowerCase().includes('devtool')) {
    missingSkills = ['CI/CD pipeline setup', 'Performance profiling'];
  } else if (track.toLowerCase().includes('mobile')) {
    missingSkills = ['Mobile app deployment (App Store/Play Store)', 'Device testing across form factors'];
  }

  // Execution strategy based on hours
  let executionStrategy = [];
  if (hours <= 12) {
    executionStrategy = [
      `1. Immediately set up the project skeleton: DB schemas, basic routes, and auth boilerplate.`,
      `2. Implement must-build features only: ${mustBuildFeatures.slice(0, 2).join(', ')}.`,
      `3. Deploy to a cloud provider within the first 6 hours. Test end-to-end flow.`,
      `4. Record a backup demo video. Focus the last 2 hours on pitch and slide preparation.`
    ];
  } else if (hours <= 24) {
    executionStrategy = [
      `1. Hours 0-4: Database setup, project scaffolding, and auth routes.`,
      `2. Hours 4-12: Implement core features: ${mustBuildFeatures.join(', ')}.`,
      `3. Hours 12-20: Build out the frontend UI, connect APIs, and wire state.`,
      `4. Hours 20-24: Integration testing, deployment, and demo rehearsal.`
    ];
  } else if (hours <= 48) {
    executionStrategy = [
      `1. Hours 0-8: Architecture planning, DB schemas, and route scaffolding.`,
      `2. Hours 8-24: Core backend controllers, API services, and validation layers.`,
      `3. Hours 24-40: Frontend component build, API wiring, and styling (glassmorphism / responsive).`,
      `4. Hours 40-${hours}: Integration testing, cloud deployment, demo slides, and pitch rehearsal.`
    ];
  } else {
    executionStrategy = [
      `1. Day 1: Architecture & DB design, REST route scaffolding, and team task assignment.`,
      `2. Day 2: Full feature implementation — core APIs, frontend components, and auth flows.`,
      `3. Day 3: Integration, automated testing, code review, and performance optimization.`,
      `4. Day 4: Final polish, production deployment, demo dry-run, and pitch preparation.`
    ];
  }

  const projectRisks = [
    parsedFeatures.length > 5 ? `Scope creep risk: ${parsedFeatures.length} features planned — consider trimming to ${Math.min(4, parsedFeatures.length)} for the hackathon window` : 'Scope creep if optional features are not frozen early',
    hours < 24 ? `Extremely tight ${hours}-hour window — any integration delays will cascade` : `Integration risks if AI service or third-party APIs fail during live demo`,
    memberLines.length === 1 ? 'Single-member team: no parallel development; plan carefully' : 'Risk of uneven workload distribution across team members'
  ].filter(Boolean);

  const improvementSuggestions = [
    `Prioritize a working end-to-end demo flow for: ${mustBuildFeatures[0] || 'core feature'} above all else.`,
    uniqueSkills.length > 0 ? `Leverage team strengths in ${uniqueSkills.slice(0, 3).join(', ')} for the highest-impact components.` : 'Assign tasks based on individual skill strengths to maximize output velocity.',
    `Set a feature freeze at ${Math.round(hours * 0.75)} hours — no new features beyond that point.`,
    `Prepare a fallback demo with mock/seed data in case live database or AI APIs become unreliable.`
  ];

  return {
    feasibilityScore: parsedFeatures.length > 8 ? 6.5 : parsedFeatures.length > 5 ? 7.5 : 8.5,
    problemSolutionAlignment: psa,
    projectRisks,
    missingSkills,
    mustBuildFeatures,
    optionalFeatures,
    featuresToRemove,
    improvementSuggestions,
    reasoning: `${projectName} has a ${parsedFeatures.length > 0 ? parsedFeatures.length + '-feature' : 'defined'} scope targeting the ${track || 'hackathon'} track over ${hours} hours. ${memberLines.length > 0 ? `The team (${memberLines.map(m => m.name).join(', ')}) brings skills in ${uniqueSkills.slice(0, 4).join(', ')}.` : ''} Focus on delivering must-build features first before touching optional ones.`,
    judgePerspective: `Judges evaluating a ${track || 'hackathon'} project will prioritize a seamless end-to-end demo. Ensure ${mustBuildFeatures[0] || 'the core feature'} is fully functional and polished. Avoid showing disabled or incomplete UI sections. Lead with the problem statement impact.`,
    executionStrategy
  };
};

/**
 * Generates mock mentor chat response for testing/fallback
 */
const generateMockChatResponse = (currentQuestion, projectContextString) => {
  const qLower = (currentQuestion || '').toLowerCase();
  if (qLower.includes('judge') || qLower.includes('questions')) {
    return `Based on your project's problem statement and track, here are the questions judges are most likely to ask:

1. **"What is the core algorithm behind the settlement optimizer, and how do you ensure correctness?"**
   * *How to answer*: Explain your greedy approach to transaction minimization, and mention your automated unit testing setup for uneven splits.
2. **"Why is AI Mentor/Copilot needed here instead of a simple static optimizer?"**
   * *How to answer*: Highlight how AI guides scope optimization, analyzes the problem-solution alignment, and dynamically mitigates risks, rather than just solving mathematical splits.
3. **"How will you handle circular debts in large group payments?"**
   * *How to answer*: Clarify how graph cycle-detection handles and scales circular dependencies before triggering transaction payouts.`;
  }
  if (qLower.includes('improve')) {
    return `To improve your project and maximize your chance of winning:

1. **Refine the Presentation**: Prepare a clear visual graph showing "Before: 12 payments needed" vs "After: 4 payments needed". Judges love quantified impact.
2. **Handle Edge Cases**: Ensure that custom splits (e.g. uneven percentages or specific item splits) work flawlessly, as judges often input custom numbers during live testing.
3. **Mock Data seeding**: Pre-load high-quality sample data so you do not waste time creating groups from scratch during the 3-minute pitch.`;
  }
  if (qLower.includes('feasibility') || qLower.includes('score') || qLower.includes('low')) {
    return `Your feasibility score reflects the complexity of the feature set relative to your team's background skills. To raise it:
* Postpone payment integrations (like Razorpay) and complex Docker deployments.
* Build the core settlement plan generation and visual graph first. Focusing on these will prove solution viability within the hackathon limits.`;
  }
  return `That's a very practical question. Given your team's current skills and the hackathon duration, I recommend focusing on getting the core React dashboard and Node backend database state connected first. AI review layers should be mocked/stubbed out if time starts running short. Let me know which specific component you want to deep dive into!`;
};

/**
 * Generates a mock task plan for testing / fallback
 */
const generateMockTaskPlan = (contextString, members = []) => {
  const count = members.length || 1;

  const allTasks = [
    'Project Architecture & Database Schema Design',
    'Authentication & Authorization (JWT)',
    'User Management & Profile API',
    'Frontend Routing & Navigation Setup',
    'Core Feature Backend API Endpoints',
    'Frontend UI Components & Pages',
    'State Management & API Integration',
    'AI Feature Integration',
    'Input Validation & Error Handling',
    'Testing & Bug Fixes',
    'Environment Configuration',
    'Production Deployment & Demo Preparation'
  ];

  const assignments = members.map((m, idx) => {
    const start = Math.floor((idx / count) * allTasks.length);
    const end = Math.floor(((idx + 1) / count) * allTasks.length);
    const tasks = allTasks.slice(start, end);
    return {
      member: m.name,
      skills: m.skills && m.skills.length > 0 ? m.skills : ['Full Stack Development'],
      assignedTasks: tasks.map(t => ({ task: t, status: 'Not Started' })),
      reason: `Balanced task allocation across ${count} team member(s) based on available skills.`
    };
  });

  const basePct = Math.floor(100 / count);
  const workloadDistribution = members.map((m, idx) => ({
    member: m.name,
    percentage: idx === members.length - 1 ? 100 - basePct * (count - 1) : basePct
  }));

  return {
    projectTasks: {
      coreFeatures: ['Core Feature Development', 'User Interface', 'API Integration'],
      technicalTasks: ['Authentication & Authorization', 'Database Schema Design', 'State Management', 'Error Handling & Validation', 'Security'],
      deploymentTasks: ['Environment Configuration', 'Production Deployment', 'Demo Preparation']
    },
    assignments,
    workloadDistribution,
    executionOrder: [
      '1. Environment Setup & Database Schema Design',
      '2. Authentication & Authorization',
      '3. User Management & Profile',
      '4. Core Feature Backend APIs',
      '5. Frontend Pages & UI Components',
      '6. AI Feature Integration',
      '7. State Management & API Wiring',
      '8. Testing & Bug Fixes',
      '9. Production Deployment & Demo Preparation'
    ],
    criticalTasks: [
      'Authentication & Authorization (JWT)',
      'Core Feature Backend API Endpoints',
      'Frontend UI Components & Pages',
      'Production Deployment & Demo Preparation'
    ],
    recommendedFocus: [
      'End-to-end working demo loop',
      'Clean, polished UI for judge presentation',
      'AI integration as the key differentiator'
    ],
    warnings: [
      'Ensure all team members agree on the architecture before coding begins.',
      'Prioritize a working demo over feature completeness.',
      'AI integration may take longer than estimated — build a mock fallback.'
    ]
  };
};

/**
 * Generates a mock marketplace recommendation
 */
const generateMockMarketplaceRecommendation = (requestDetails) => {
  const { requestType, requestedBy, targetUser, reason } = requestDetails;
  let recommendation = 'Approve';
  let confidenceScore = 85;
  let aiReason = `The requested ${requestType.toLowerCase()} seems reasonable to support team productivity.`;

  if (requestType === 'SWAP') {
    aiReason = `${requestedBy} and ${targetUser} are swapping tasks. This alignment matches skills profile and keeps workload balanced at equal shares.`;
    confidenceScore = 90;
  } else if (requestType === 'REASSIGNMENT') {
    aiReason = `Reassignment requested by ${requestedBy} due to: "${reason}". Task is marked as Available for other members to claim.`;
    confidenceScore = 80;
  } else if (requestType === 'COLLABORATOR') {
    aiReason = `Adding ${targetUser} as a collaborator to assist ${requestedBy} reduces delivery risk for critical MVP milestones.`;
    confidenceScore = 95;
  } else if (requestType === 'CLAIM') {
    aiReason = `${requestedBy} volunteered to claim this available task, increasing overall progress velocity.`;
    confidenceScore = 88;
  }

  return {
    recommendation,
    confidenceScore,
    reason: aiReason
  };
};

/**
 * Generates a mock tech stack consensus analysis for fallback
 */
const generateMockTechStackAnalysis = (proposal, votes = [], members = []) => {
  let approveCount = 0;
  let totalVotes = votes.length;
  let totalConfidence = 0;
  let techCount = 0;
  
  votes.forEach(v => {
    if (v.voteType === 'Approve') approveCount += 1.0;
    else if (v.voteType === 'Approve With Concerns') approveCount += 0.7;
    else approveCount += 0.1;
    
    if (v.confidenceScores) {
      const scores = v.confidenceScores instanceof Map ? Object.fromEntries(v.confidenceScores) : v.confidenceScores;
      Object.values(scores).forEach(score => {
        totalConfidence += Number(score);
        techCount++;
      });
    }
  });
  
  const consensusScore = totalVotes > 0 ? Math.round((approveCount / totalVotes) * 100) : 100;
  const avgConfidence = techCount > 0 ? (totalConfidence / techCount) : 8;
  const readinessScore = Math.round(avgConfidence * 10);
  
  return {
    readinessScore: readinessScore,
    consensusScore: consensusScore,
    strengths: [
      `Frontend choice of "${proposal.frontend || 'React'}" matches the general team skillset.`,
      `Vercel is selected for deployment, allowing rapid iterative updates during the hackathon.`
    ],
    risks: votes.some(v => v.voteType === 'Reject' || v.voteType === 'Approve With Concerns') ? [
      `Some team members raised concerns or rejects due to lack of experience with proposed backend/database.`
    ] : [
      `Learning curves for some selected tools might eat into actual feature development time.`
    ],
    recommendedChanges: votes.some(v => v.voteType === 'Reject') ? [
      `Switch database / backend technologies with low confidence to proposed alternatives.`
    ] : [
      `Ensure team initializes boilerplate configurations before the hackathon begins.`
    ],
    recommendedStack: {
      frontend: [proposal.frontend || 'React'],
      backend: [proposal.backend || 'Node.js'],
      database: [proposal.database || 'MongoDB'],
      ai: [proposal.ai || 'Featherless AI'],
      deployment: [proposal.deployment || 'Vercel']
    },
    reasoning: `The team has an average technology confidence of ${avgConfidence.toFixed(1)}/10. Consensus score is ${consensusScore}%. Team is mostly prepared, but low confidence on backend should be addressed.`,
    finalRecommendation: `Accept the stack but consider switching backend to Node.js / Express for speed.`
  };
};

/**
 * Generate a mock Hackathon Command Center AI analysis report.
 */
const generateMockCommandCenterReport = (context) => {
  const { projectDetails, timeRemaining, taskPlan } = context;
  const assignments = taskPlan?.assignments || [];
  const totalTasks = assignments.reduce((sum, a) => sum + (a.assignedTasks?.length || 0), 0);
  const completedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Completed')?.length || 0), 0);
  const blockedTasks = assignments.reduce((sum, a) =>
    sum + (a.assignedTasks?.filter(t => t.status === 'Blocked')?.length || 0), 0);
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let overallStatus = 'On Track';
  let riskLevel = 'Low';
  if (pct < 25) { overallStatus = 'High Risk'; riskLevel = 'High'; }
  else if (pct < 50) { overallStatus = 'Slightly Behind'; riskLevel = 'Medium'; }
  else if (pct >= 80) { overallStatus = 'Ready For Demo'; }

  const hoursLeftMatch = (timeRemaining || '').match(/(\d+)/);
  const hoursLeft = hoursLeftMatch ? parseInt(hoursLeftMatch[1], 10) : 24;

  let executionStrategy = [];
  if (hoursLeft <= 6) {
    executionStrategy = [
      'CRITICAL FREEZE: Implement absolutely no new features. Fix critical path bugs only.',
      'Demo Deployment: Deploy current stable branch to Vercel/Render immediately.',
      'Dry Run: Test the end-to-end user loop 3 times. Record a fallback video.',
      'Pitch Prep: Focus on problem statement impact and live demo setup.'
    ];
  } else if (hoursLeft <= 12) {
    executionStrategy = [
      'Feature Freeze: Lock features and focus on database and API integration.',
      'Integration & Testing: Test API connectivity and mock fallback database connections.',
      'Basic Deployment: Build production bundles and deploy early version to staging.',
      'UI Refinement: Polishing alignments, styles, and dashboard metrics.'
    ];
  } else if (hoursLeft <= 24) {
    executionStrategy = [
      'Backend MVP Completion: Finalize database controllers and github API services.',
      'Frontend Layout & Hook Integration: Bind API endpoints to client components.',
      'Core Feature Validation: Verify automated task parsing and consensus rules.',
      'Freeze, Polish & Pitch Prep: Clean up code and prepare pitch materials.'
    ];
  } else {
    executionStrategy = [
      'Core Architecting: Finalize database models, router endpoints, and third-party integrations.',
      'Iterative Building: Team splits tasks across database, APIs, and React interfaces.',
      'Testing & Verification: Set up unit tests, code verification scripts, and lint checkups.',
      'Polish & UI Refinements: Polish UI micro-animations, glassmorphism transitions, and demo slides.'
    ];
  }

  return {
    overallStatus,
    riskLevel,
    completionPrediction: `Based on current velocity, the team is ${pct}% complete with ${timeRemaining}. ${
      pct >= 70 ? 'On track for a successful demo.' :
      pct >= 40 ? 'Focus is required on critical path tasks.' :
      'Significant effort needed — consider scope reduction.'
    }`,
    currentFocus: [
      `Complete remaining ${totalTasks - completedTasks} pending tasks`,
      'Finalize core MVP features before adding extras',
      'Prepare demo environment and test all user flows',
    ].filter(Boolean),
    tasksToPostpone: blockedTasks > 0 ? [
      'Any non-critical nice-to-have features',
      'Advanced analytics and reporting dashboards',
      'Third-party integrations that are not core to the demo'
    ] : [],
    reasoning: `The team has completed ${completedTasks} of ${totalTasks} tasks (${pct}%). ${
      blockedTasks > 0 ? `There are ${blockedTasks} blocked tasks that need immediate attention.` : 'No blocked tasks detected.'
    } Prioritize the critical path to ensure a working demo.`,
    judgePreparationTips: [
      'Lead with the problem statement and quantify the impact clearly',
      'Demonstrate a working end-to-end user flow, not just individual features',
      'Prepare answers for: "Why this approach?" and "What would you build next?"',
      'Have a backup demo video in case of live demo technical issues',
    ],
    executionStrategy
  };
};

/**
 * Generate a context-aware fallback repository analysis if keys are missing/failed.
 */
const generateFallbackRepoAnalysis = (context) => {
  const { healthStatus, healthScore, hasReadme, hasTestFiles, hasDeployment } = context;
  return {
    repositoryHealth: healthStatus || 'Healthy',
    developmentStatus: 'Active',
    documentationStatus: hasReadme ? 'Good (README found)' : 'Missing README',
    testingStatus: hasTestFiles ? 'Tests detected' : 'No tests found',
    deploymentStatus: hasDeployment ? 'Deployment configured' : 'Missing configuration',
    inactiveMembers: [],
    missingComponents: [],
    repositoryWarnings: [
      !hasReadme && 'README file is missing from repository.',
      !hasTestFiles && 'No test files detected in repository tree.',
      !hasDeployment && 'No deployment configurations found (Dockerfile, vercel.json, etc.).'
    ].filter(Boolean),
    recommendations: [
      'Set up a solid README to guide pitch judges.',
      'Add test scripts and setup a basic test suite to improve score.',
      'Configure production deployment setups early to prevent late delivery issues.'
    ],
    reasoning: 'Repository scanned successfully. Computed metrics based on repository metadata and file indicators.'
  };
};

module.exports = {
  generateMockAnalysis,
  generateMockProjectReview,
  generateMockChatResponse,
  generateMockTaskPlan,
  generateMockMarketplaceRecommendation,
  generateMockTechStackAnalysis,
  generateMockCommandCenterReport,
  generateFallbackRepoAnalysis
};
