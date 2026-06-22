require('dotenv').config();
const { analyzeProjectWithAI } = require('./services/aiService');

async function testProjectAnalysis() {
  console.log('\n--- Testing analyzeProjectWithAI ---');
  const projectContextString = `Project Name: HackBuddy
Track: Developer Tools
Duration: 36 hours
Problem Statement: Hackathon teams struggles to agree on a tech stack.
Description: Collaborative tool with voting, confidence scores, and AI recommendations.
Features to Build:
- Propose stack
- Team voting & confidence scoring
- AI stack analysis
- AI task plan generation

Sahil (Skills: React, Node.js, MongoDB)
`;

  const start = Date.now();
  try {
    const result = await analyzeProjectWithAI(projectContextString);
    console.log(`Success! Took ${(Date.now() - start) / 1000}s`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error after ${(Date.now() - start) / 1000}s:`, err.message || err);
  }
}

testProjectAnalysis();
