import { 
  MOCK_USER, 
  MOCK_TEAMS, 
  MOCK_PROJECTS, 
  MOCK_CHAT_HISTORY, 
  MOCK_CHAT_RESPONSE, 
  MOCK_TECH_STACK, 
  MOCK_TASK_PLAN, 
  MOCK_GITHUB_ANALYTICS, 
  MOCK_REALITY_CHECK 
} from './mockData.js';

export async function setupRouteMocks(page) {
  // Mock auth login/register
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, token: 'mock_jwt_token', user: MOCK_USER })
    });
  });

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, token: 'mock_jwt_token', user: MOCK_USER })
    });
  });

  // Mock profile
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER)
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_USER, profileCompleted: true })
      });
    }
  });

  // Mock teams
  await page.route('**/api/team/my-teams', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TEAMS)
    });
  });

  await page.route('**/api/team/create', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        team: MOCK_TEAMS[0],
        inviteCode: 'VIBE99',
        inviteLink: 'http://localhost:5173/join/VIBE99'
      })
    });
  });

  await page.route('**/api/team/join', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Joined successfully',
        team: MOCK_TEAMS[0]
      })
    });
  });

  await page.route('**/api/team/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TEAMS[0])
    });
  });

  // Mock projects
  await page.route('**/api/project/team/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, project: MOCK_PROJECTS[0] })
    });
  });

  await page.route('**/api/project/create', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, project: MOCK_PROJECTS[0] })
    });
  });

  await page.route('**/api/project/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Project deleted' })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, project: MOCK_PROJECTS[0] })
      });
    }
  });

  // Mock chat history and chat message sending
  await page.route('**/api/project/*/chat', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_HISTORY)
      });
    } else {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHAT_RESPONSE)
      });
    }
  });

  // Mock project review / feasibility check
  await page.route('**/api/project/*/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        projectReview: MOCK_PROJECTS[0].projectReview,
        projectReviewGeneratedAt: new Date().toISOString()
      })
    });
  });

  // Mock task plan splitter
  await page.route('**/api/project/*/generate-task-plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASK_PLAN)
    });
  });

  await page.route('**/api/project/*/regenerate-task-plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASK_PLAN)
    });
  });

  // Mock Tech Stack Consensus
  await page.route('**/projects/*/tech-stack', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TECH_STACK)
    });
  });

  await page.route('**/projects/*/tech-stack/proposal', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, proposal: MOCK_TECH_STACK.proposal })
    });
  });

  await page.route('**/projects/*/tech-stack/vote', async (route) => {
    const responseProposal = { ...MOCK_TECH_STACK.proposal };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, proposal: responseProposal })
    });
  });

  await page.route('**/projects/*/tech-stack/finalize', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Consensus finalized' })
    });
  });

  // Mock GitHub endpoints
  await page.route('**/projects/*/hackathon/github/analytics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_GITHUB_ANALYTICS)
    });
  });

  await page.route('**/projects/*/hackathon/github/sync', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Sync complete' })
    });
  });

  await page.route('**/projects/*/hackathon/github/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'AI Analysis complete' })
    });
  });

  await page.route('**/projects/*/hackathon/github/reality-check', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REALITY_CHECK)
    });
  });
}
