require('dotenv').config();
const { analyzeTechStackWithAI, generateTaskPlanWithAI } = require('./services/aiService');

async function testTechStackAnalysis() {
  console.log('\n--- Testing analyzeTechStackWithAI ---');
  const proposalContext = {
    proposal: {
      frontend: 'React',
      backend: 'Node.js',
      database: 'MongoDB',
      ai: 'Gemini',
      deployment: 'Vercel'
    },
    votes: [
      {
        voter: 'Sahil',
        voteType: 'Approve',
        confidenceScores: { frontend: 8, backend: 8, database: 8, ai: 8, deployment: 8 },
        reason: 'Looks good and we know React/Node.',
        suggestedAlternatives: {}
      }
    ],
    members: [{ name: 'Sahil' }]
  };
  const teamContext = `- Sahil: Skills: [React, Node.js, MongoDB], Resume parsed: No\n`;
  const hackathonDuration = '36 hours';
  const projectComplexity = 'Problem: Need a collaborative tool for hackathons. Features: Auth, Real-time Voting, AI consensus score';

  const start = Date.now();
  try {
    const result = await analyzeTechStackWithAI(proposalContext, teamContext, hackathonDuration, projectComplexity);
    console.log(`Success! Took ${(Date.now() - start) / 1000}s`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error after ${(Date.now() - start) / 1000}s:`, err.message || err);
  }
}

async function testTaskPlan() {
  console.log('\n--- Testing generateTaskPlanWithAI ---');
  const contextString = `Project Name: HackBuddy
Track: Developer Tools
Duration: 36 hours
Problem Statement: Hackathon teams struggles to agree on a tech stack.
Description: Collaborative tool with voting, confidence scores, and AI recommendations.
Features To Build:
- Propose stack
- Team voting & confidence scoring
- AI stack analysis
- AI task plan generation

Final Tech Stack:
- Frontend: React
- Backend: Node.js
- Database: MongoDB
- AI/ML: OpenRouter Qwen
- Deployment: Vercel
`;

  const members = [
    { name: 'Sahil', skills: ['React', 'Node.js', 'MongoDB'] }
  ];

  const start = Date.now();
  try {
    const result = await generateTaskPlanWithAI(contextString, members);
    console.log(`Success! Took ${(Date.now() - start) / 1000}s`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error after ${(Date.now() - start) / 1000}s:`, err.message || err);
  }
}

async function run() {
  await testTechStackAnalysis();
  await testTaskPlan();
}

run();

