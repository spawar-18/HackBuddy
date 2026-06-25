export const MOCK_USER = {
  _id: 'user_123',
  name: 'Sahil Ojha',
  email: 'sahil@vibecoders.com',
  avatar: 'https://avatars.githubusercontent.com/u/12345?v=4',
  skills: ['React', 'Node.js', 'Tailwind CSS', 'MongoDB'],
  profileCompleted: true,
  createdAt: '2026-06-25T08:00:00Z'
};

export const MOCK_TEAMS = [
  {
    _id: 'team_1',
    teamName: 'Vibecoders',
    description: 'Building premium agentic AI dashboards',
    inviteCode: 'VIBE99',
    createdBy: 'user_123',
    members: [
      { _id: 'user_123', name: 'Sahil Ojha', email: 'sahil@vibecoders.com', avatar: 'https://avatars.githubusercontent.com/u/12345?v=4' },
      { _id: 'user_456', name: 'Nikhil Ojha', email: 'nikhil@vibecoders.com', avatar: 'https://avatars.githubusercontent.com/u/45678?v=4' },
      { _id: 'user_789', name: 'Ayush Kumar', email: 'ayush@vibecoders.com', avatar: 'https://avatars.githubusercontent.com/u/78901?v=4' }
    ]
  }
];

export const MOCK_PROJECTS = [
  {
    _id: 'proj_1',
    projectName: 'HackVerse Copilot',
    problemStatement: 'Managing hackathon teams is cluttered and hard to scale.',
    description: 'An AI-powered co-pilot dashboard for hackathon project organization, team structure, reality check tracking, and technology consensus voting.',
    track: 'AI/ML Track',
    duration: '36h',
    featuresToBuild: ['Feasibility check', 'Consensus voting', 'Task splitter', 'Reality checker'],
    teamId: 'team_1',
    createdBy: 'user_123',
    status: 'In Progress',
    createdAt: '2026-06-25T08:05:00Z',
    projectReview: {
      feasibilityScore: 8.5,
      problemSolutionAlignment: 'The problem statement aligns extremely well with the co-pilot solution.',
      projectRisks: [
        'Time constraint for implementing both chat and task logic.',
        'High OpenRouter API token cost under load.'
      ],
      missingSkills: ['Vite packaging optimization', 'Rolldown configuration'],
      mustBuildFeatures: ['Feasibility review card', 'Playwright framework implementation'],
      optionalFeatures: ['Auto-refresh interval configurations'],
      featuresToRemove: ['Excess sidebar options'],
      improvementSuggestions: ['Use client-side mock strategies for faster dev cycles'],
      reasoning: 'The stack selected is highly optimal. Risks are manageable.',
      judgePerspective: 'A solid UI implementation will validate the premium layout requirements.',
      executionStrategy: ['Step 1: Set up tests directory structure', 'Step 2: Mock API endpoints']
    },
    finalTechStack: {
      frontend: 'React + Vite',
      backend: 'Express.js',
      database: 'MongoDB Atlas',
      isFinalized: true
    }
  }
];

export const MOCK_CHAT_HISTORY = {
  success: true,
  messages: [
    { _id: 'msg_1', sender: 'user', message: 'How do we solve mock tokens?', timestamp: '2026-06-25T08:10:00Z' },
    { _id: 'msg_2', sender: 'assistant', message: 'You can intercept incoming routes using playwright page.route and mock them with local objects.', timestamp: '2026-06-25T08:10:05Z' }
  ]
};

export const MOCK_CHAT_RESPONSE = {
  success: true,
  userMessage: { _id: 'msg_3', sender: 'user', message: 'Is Playwright running in parallel?', timestamp: '2026-06-25T18:30:00Z' },
  assistantMessage: { _id: 'msg_4', sender: 'assistant', message: 'Yes, Playwright tests run in parallel by default, which can be configured via fullyParallel in playwright.config.js.', timestamp: '2026-06-25T18:30:02Z' }
};

export const MOCK_TECH_STACK = {
  success: true,
  proposal: {
    _id: 'prop_1',
    projectId: 'proj_1',
    proposedBy: 'user_123',
    technologies: {
      frontend: 'React + Vite',
      backend: 'Express.js',
      database: 'MongoDB Atlas'
    },
    isFinalized: false,
    votes: [
      { userId: 'user_123', vote: 'approve', name: 'Sahil Ojha' },
      { userId: 'user_456', vote: 'approve', name: 'Nikhil Ojha' }
    ],
    comments: [
      { userId: 'user_123', name: 'Sahil Ojha', comment: 'Express.js is very reliable.', createdAt: '2026-06-25T08:15:00Z' }
    ]
  }
};

export const MOCK_TASK_PLAN = {
  success: true,
  taskPlan: {
    assignments: [
      {
        memberId: 'user_123',
        memberName: 'Sahil Ojha',
        assignedTasks: [
          { taskId: 'task_1', title: 'Setup Playwright infrastructure', description: 'Write Page Object Models and Specs', status: 'In Progress', complexity: 'Medium', dependencies: [] },
          { taskId: 'task_2', title: 'Deployment pipeline validation', description: 'Create GitHub actions integration', status: 'Planning', complexity: 'Easy', dependencies: ['task_1'] }
        ]
      },
      {
        memberId: 'user_456',
        memberName: 'Nikhil Ojha',
        assignedTasks: [
          { taskId: 'task_3', title: 'Write authentication mocks', description: 'Create token validation logic', status: 'Completed', complexity: 'Hard', dependencies: [] }
        ]
      }
    ],
    generatedAt: '2026-06-25T08:20:00Z'
  }
};

export const MOCK_GITHUB_ANALYTICS = {
  connected: true,
  owner: 'vibecoders',
  repository: 'hackbuddy',
  defaultBranch: 'main',
  repositoryUrl: 'https://github.com/vibecoders/hackbuddy',
  repositoryVisibility: 'public',
  lastSyncedAt: '2026-06-25T18:00:00Z',
  healthStatus: 'Excellent',
  healthScore: 94,
  stats: {
    commitsToday: 12,
    contributorCount: 3,
    openPRCount: 1,
    openIssueCount: 2,
    branchCount: 5
  },
  commitSummary: {
    lastCommitMessage: 'feat: setup tests for command center and github panels',
    lastCommitAuthor: 'Sahil Ojha',
    lastCommitAt: '2026-06-25T18:07:43Z',
    last7Days: 24
  },
  languages: {
    JavaScript: 65000,
    CSS: 35000,
    HTML: 1000
  },
  healthIndicators: {
    'Tests Found': 'Playwright Specs Integrated',
    'CI/CD Workflows': 'GitHub Actions workflow file detected',
    'Documentation': 'README.md exists and is updated'
  },
  openPullRequests: [
    { number: 4, title: 'feat: add task splitter spec tests', url: 'https://github.com/vibecoders/hackbuddy/pull/4' }
  ],
  openIssues: [
    { number: 12, title: 'bug: tab text contrast in light theme', url: 'https://github.com/vibecoders/hackbuddy/issues/12' }
  ],
  recentCommits: [
    { sha: 'abcdef123456', author: 'Sahil Ojha', message: 'feat: setup tests for command center and github panels', date: '2026-06-25T18:07:43Z', url: 'https://github.com/vibecoders/hackbuddy/commit/abcdef123456' },
    { sha: '987654321fed', author: 'Nikhil Ojha', message: 'fix: resolved card backgrounds inside tabs view', date: '2026-06-25T17:12:00Z', url: 'https://github.com/vibecoders/hackbuddy/commit/987654321fed' }
  ],
  contributors: [
    { login: 'sahil-ojha', avatar: 'https://avatars.githubusercontent.com/u/12345?v=4', profileUrl: 'https://github.com/sahil-ojha', commits: 15, recentCommits: 3, lastActive: '2026-06-25T18:07:43Z', isActive: true },
    { login: 'nikhil-ojha', avatar: 'https://avatars.githubusercontent.com/u/45678?v=4', profileUrl: 'https://github.com/nikhil-ojha', commits: 8, recentCommits: 1, lastActive: '2026-06-25T17:12:00Z', isActive: true }
  ],
  aiAnalysis: {
    repositoryHealth: 'Excellent',
    developmentStatus: 'Highly active. Continuous deliveries in progress.',
    documentationStatus: 'Good structure. Setup guide included.',
    testingStatus: 'Needs Playwright configuration framework.',
    deploymentStatus: 'Vercel automation configured.',
    inactiveMembers: [],
    missingComponents: [],
    repositoryWarnings: [],
    recommendations: [
      'Write end-to-end integration flows.',
      'Check responsive mobile viewport layout.'
    ],
    reasoning: 'The commit logs show high alignment between code deliverables and track requirements.'
  }
};

export const MOCK_REALITY_CHECK = {
  success: true,
  summary: {
    verified: 3,
    warnings: 0,
    active: 2,
    noActivity: 0,
    ahead: 1,
    notStarted: 0
  },
  realityChecks: [
    { task: 'Setup Playwright infrastructure', member: 'Sahil Ojha', taskStatus: 'In Progress', verdict: 'Verified', message: '3 commits found matching playwright references.', relatedCommitCount: 3 },
    { task: 'Write authentication mocks', member: 'Nikhil Ojha', taskStatus: 'Completed', verdict: 'Verified', message: 'Completed. Multiple commits match validation keywords.', relatedCommitCount: 2 }
  ],
  lastSyncedAt: '2026-06-25T18:10:00Z'
};
