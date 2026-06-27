require('dotenv').config();
const { generateMockProjectReview } = require('./services/ai/mockFallbacks');

// Simulate what ContextBuilder returns for a real project with 7 features
const fakeCtx = [
  '==================================================',
  'CENTRAL AI ENGINE PROJECT CONTEXT',
  '==================================================',
  '',
  '--- 1. CORE PROJECT DATA ---',
  'Project Name: SmartBudget AI',
  'Problem Statement: Students overspend because they lack real-time spending insights.',
  'Description: An AI-powered budget tracker with smart alerts and spending predictions.',
  'Track: FinTech',
  'Planned Duration: 36 hours',
  'Status: Planning',
  'Features to Build:',
  '  - User authentication and onboarding',
  '  - Expense tracking with categories',
  '  - AI-powered spending prediction',
  '  - Smart budget alerts',
  '  - Monthly report generation',
  '  - Currency converter integration',
  '  - CSV export',
  '',
  '--- 3. TEAM MEMBERS, ROLES, & SKILLS ---',
  '- Alex (Member) | Skills: React, Node.js, MongoDB',
  '- Maria (Member) | Skills: Python, Machine Learning, FastAPI',
].join('\n');

const result = generateMockProjectReview(fakeCtx);
console.log(JSON.stringify(result, null, 2));
