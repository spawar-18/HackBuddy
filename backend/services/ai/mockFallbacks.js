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
 * Generates mock project review for fallback/testing
 */
const generateMockProjectReview = (projectContextString) => {
  const durationMatch = (projectContextString || '').match(/Duration:\s*(\d+)\s*hours?/i) || (projectContextString || '').match(/Duration:\s*(\d+)/i);
  const hours = durationMatch ? parseInt(durationMatch[1], 10) : 24;

  let executionStrategy = [];
  if (hours <= 12) {
    executionStrategy = [
      '1. Setup minimal database schemas and mockup endpoints immediately.',
      '2. Develop the absolute core feature flow on frontend and backend (freeze optional features).',
      '3. Deploy to production early (e.g. within 6 hours) to test hosting connectivity.',
      '4. Polish key presentation views and record a backup demo walkthrough.'
    ];
  } else if (hours <= 24) {
    executionStrategy = [
      '1. Database & Route Setup: Build schemas and core REST APIs (first 4 hours).',
      '2. AI Service Hookup: Connect LLM APIs and set up parser/repaired JSON parsing (hours 4-10).',
      '3. UI Development: Build responsive dashboard panels, lists, and loading indicators (hours 10-18).',
      '4. Integration, Testing, Deployment and demo pitch rehearsals (final 6 hours).'
    ];
  } else if (hours <= 48) {
    executionStrategy = [
      '1. Architecture Design & Setup: Establish DB schemas, routers, and test files (first 8 hours).',
      '2. Core API & State Sync: Implement complete controllers, team sync hooks, and validations (hours 8-20).',
      '3. Frontend Assembly & Custom Styling: Design premium glassmorphism layouts, lists, and forms (hours 20-36).',
      '4. Rigorous manual testing, deployments, git-sync verification, and demo day slide preparation (final 12 hours).'
    ];
  } else {
    executionStrategy = [
      '1. Specification & Framework Setup: Complete database schema designs and REST routes architectures (Day 1).',
      '2. Feature Implementation Phase: Implement APIs, backend services, and front-end interface layouts (Day 2).',
      '3. Verification & Optimization: Establish automated task verifiers, performance metrics, and caching (Day 3).',
      '4. Deployment, styling polish, and extensive judge-day presentation rehearsal (Day 4/Final).'
    ];
  }

  return {
    feasibilityScore: 8.5,
    problemSolutionAlignment: 'The proposed solution aligns strongly with the problem of hackathon scope inflation. The core features address the key pain points directly, but the technical scope is slightly high for the duration.',
    projectRisks: [
      'AI service integration timeout risks',
      'Incomplete feature loop on user dashboards during live presentation',
      'Scope creep leading to unfinished components'
    ],
    missingSkills: [
      'Cloud infrastructure configuration',
      'Professional database scaling'
    ],
    mustBuildFeatures: [
      'AI Project Review Core API',
      'Form Validation and character thresholds',
      'Loading/spinner dashboard feedback'
    ],
    optionalFeatures: [
      'Team member messaging integrations',
      'Live sync with GitHub repo commits'
    ],
    featuresToRemove: [
      'Advanced LLM multi-agent fine-tuning modules'
    ],
    improvementSuggestions: [
      'Focus strictly on validating problem statement text input to ensure high review accuracy.',
      'Optimize temperature settings to 0 to yield highly deterministic responses.'
    ],
    reasoning: 'The technical blueprint is highly structured, and the team members possess strong full-stack skills. Postponing high-overhead features will guarantee a successful working prototype.',
    judgePerspective: 'Judges will prioritize a functional end-to-end user loop. Avoid displaying too many disabled features on the UI during demo day.',
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
