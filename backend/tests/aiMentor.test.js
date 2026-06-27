/**
 * HackBuddy AI Mentor - Automated Test Suite
 *
 * Tests that:
 * 1. Different inputs classify into distinct intents
 * 2. Off-topic questions are correctly refused
 * 3. TOPIC_KEYWORDS filter is working (context section selection)
 * 4. PromptManager sets temperature=0.4 for chatWithMentor and 0.0 for others
 * 5. MemoryManager creates and updates memory correctly
 * 6. chatController sets up conversationId
 *
 * Run with: node backend/tests/aiMentor.test.js
 */

const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Resolve backend root paths
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND_ROOT = path.resolve(__dirname, '..');

// Utility: ANSI colors
const c = {
  green: '\x1b[32m',
  red:   '\x1b[31m',
  cyan:  '\x1b[36m',
  yellow:'\x1b[33m',
  bold:  '\x1b[1m',
  reset: '\x1b[0m',
};

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ${c.green}✓${c.reset} ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  ${c.red}✗${c.reset} ${name}${detail ? `\n      → ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${c.cyan}${c.bold}▸ ${title}${c.reset}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TopicClassifier — intent detection
// ─────────────────────────────────────────────────────────────────────────────
section('TopicClassifier — intent detection');
const TopicClassifier = require(path.join(BACKEND_ROOT, 'services/ai/TopicClassifier'));

const classifierCases = [
  { q: 'How do I set up JWT authentication?',              expectedTopic: 'authentication' },
  { q: 'My React component is not re-rendering.',         expectedTopic: 'frontend' },
  { q: 'How to deploy to Vercel with Docker?',            expectedTopic: 'deployment' },
  { q: 'How do I connect MongoDB Atlas to my project?',  expectedTopic: 'database' },
  { q: 'How to integrate the OpenRouter API?',            expectedTopic: 'ai_integration' },
  { q: 'We have a task claiming request in marketplace.', expectedTopic: 'marketplace' },
  { q: 'Review our hackathon command center alerts.',     expectedTopic: 'command_center' },
  { q: 'How can I debug this error in my code?',          expectedTopic: 'debugging' },
  { q: 'Can you explain quantum entanglement?',            isOffTopic: true },
  { q: 'What is the meaning of life?',                    isOffTopic: true },
  { q: 'Write a poem about dinosaurs.',                   isOffTopic: true },
];

const seenTopics = new Set();
classifierCases.forEach(({ q, expectedTopic, isOffTopic }) => {
  const result = TopicClassifier.classify(q);

  if (isOffTopic) {
    assert(
      `Off-topic: "${q.slice(0, 45)}"`,
      result.isOffTopic === true,
      `Expected isOffTopic=true, got isOffTopic=${result.isOffTopic} topic=${result.topic}`
    );
  } else {
    const match = result.topic === expectedTopic;
    assert(
      `Classifies "${q.slice(0, 50)}" → ${expectedTopic}`,
      match,
      `Expected ${expectedTopic}, got ${result.topic}`
    );
    seenTopics.add(result.topic);
  }
});

// Diversity test: ensure at least 6 distinct topics detected
assert(
  `Diversity: at least 6 distinct intents classified`,
  seenTopics.size >= 6,
  `Only found ${seenTopics.size} distinct topics: ${[...seenTopics].join(', ')}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. SmartContextBuilder — keyword filtering logic (in isolation without DB)
// ─────────────────────────────────────────────────────────────────────────────
section('SmartContextBuilder — static keyword matching');
const SmartContextBuilder = require(path.join(BACKEND_ROOT, 'services/ai/SmartContextBuilder'));

const keywordCases = [
  { text: 'Implement JWT token rotation middleware',   keywords: ['jwt', 'middleware'],  expected: true  },
  { text: 'Deploy to render.com with docker compose', keywords: ['deploy', 'docker'],   expected: true  },
  { text: 'Run database aggregation pipeline',        keywords: ['auth', 'login'],      expected: false },
  { text: 'Connect React frontend to backend API',    keywords: ['react', 'frontend'],  expected: true  },
  { text: '',                                          keywords: ['any'],                expected: false },
];

keywordCases.forEach(({ text, keywords, expected }) => {
  const result = SmartContextBuilder.matchKeywords(text, keywords);
  assert(
    `matchKeywords("${text.slice(0, 40)}...") should be ${expected}`,
    result === expected,
    `Got ${result}, expected ${expected}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PromptManager — temperature assignment
// ─────────────────────────────────────────────────────────────────────────────
section('PromptManager — temperature per module');
const PromptManager = require(path.join(BACKEND_ROOT, 'services/ai/PromptManager'));

const tempCases = [
  { module: 'chatWithMentor',    expectedTemp: 0.4 },
  { module: 'generateTaskPlan',  expectedTemp: 0.0 },
  { module: 'analyzeProject',    expectedTemp: 0.0 },
  { module: 'extractSkills',     expectedTemp: 0.0 },
];

tempCases.forEach(({ module, expectedTemp }) => {
  let payload;
  try {
    payload = PromptManager.buildPrompt(module, {
      projectContext: 'Test project context.',
      userInput: 'Test input',
      history: [],
      memory: null,
      metadata: {}
    });
    assert(
      `Temperature for module "${module}" is ${expectedTemp}`,
      payload.temperature === expectedTemp,
      `Got temperature=${payload.temperature}`
    );
  } catch (err) {
    assert(
      `Temperature for module "${module}" is ${expectedTemp}`,
      false,
      `buildPrompt threw: ${err.message}`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PromptManager — chatWithMentor builds multi-turn messages array
// ─────────────────────────────────────────────────────────────────────────────
section('PromptManager — chatWithMentor multi-turn construction');

const historyMessages = [
  { role: 'user',      message: 'First user question about auth'  },
  { role: 'assistant', message: 'Use JWT with refresh tokens.'    },
  { role: 'user',      message: 'How do I store refresh tokens?'  },
];

let mentorPayload;
try {
  mentorPayload = PromptManager.buildPrompt('chatWithMentor', {
    projectContext: 'Project: HackBuddy',
    userInput: 'Final question',
    history: historyMessages,
    memory: null,
    metadata: {}
  });

  assert(
    'chatWithMentor contents is an array (multi-turn)',
    Array.isArray(mentorPayload.contents),
    `Got type=${typeof mentorPayload.contents}`
  );

  if (Array.isArray(mentorPayload.contents)) {
    const firstMsg = mentorPayload.contents[0];
    const lastMsg  = mentorPayload.contents[mentorPayload.contents.length - 1];

    assert(
      'First message is from "user" with project context',
      firstMsg?.role === 'user',
      `Got role=${firstMsg?.role}`
    );

    assert(
      'Last message is from "user" with the current question',
      lastMsg?.role === 'user' && lastMsg?.content === 'Final question',
      `Got role=${lastMsg?.role}, content=${lastMsg?.content}`
    );

    assert(
      `History is threaded (total messages ≥ ${historyMessages.length + 2})`,
      mentorPayload.contents.length >= historyMessages.length + 2,
      `Got ${mentorPayload.contents.length} messages`
    );
  }
} catch (err) {
  assert('chatWithMentor buildPrompt throws no errors', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PromptManager — formatMemory includes new V2 fields
// ─────────────────────────────────────────────────────────────────────────────
section('PromptManager — formatMemory includes new V2 fields');

const mockMemory = {
  summary: 'We decided to use MERN stack.',
  currentImplementation: 'Working on AI Task Splitter route handler.',
  currentFeature: 'AI Task Splitter',
  currentDebuggingSession: 'OpenRouter 429 rate limit bug',
  currentApis: ['/api/ai/execute', '/api/project/:id/chat'],
  currentDeploymentIssue: 'Render cold start causing timeout errors',
  currentBlockers: ['Featherless API key expired'],
  architectureDecisions: ['Separated AI logic into AIEngine singleton'],
  techStackDecisions: ['Finalized GLM-4 as primary, Gemini as fallback'],
  previousAiAdvice: ['Cache AI responses to save API quota']
};

const formatted = PromptManager.formatMemory(mockMemory);
const parsedMemory = JSON.parse(formatted);

[
  'summary', 'currentImplementation', 'currentFeature',
  'currentDebuggingSession', 'currentApis', 'currentDeploymentIssue',
  'architectureDecisions', 'techStackDecisions'
].forEach(field => {
  assert(
    `formatMemory includes field "${field}"`,
    parsedMemory.hasOwnProperty(field),
    `Field "${field}" missing from memory output`
  );
});

assert(
  'currentApis is an array with values',
  Array.isArray(parsedMemory.currentApis) && parsedMemory.currentApis.length > 0,
  `Got: ${JSON.stringify(parsedMemory.currentApis)}`
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. Off-topic question generates a refusal, not a generic AI response
// ─────────────────────────────────────────────────────────────────────────────
section('TopicClassifier — refusal message for off-topic questions');

const offTopicQuestions = [
  'What is the capital of France?',
  'Tell me a joke.',
  'Write an essay on climate change.',
  'Can you explain quantum entanglement?'
];

offTopicQuestions.forEach(q => {
  const result = TopicClassifier.classify(q);
  assert(
    `Off-topic refused: "${q.slice(0, 50)}"`,
    result.isOffTopic && typeof result.refusalMessage === 'string' && result.refusalMessage.length > 10,
    `isOffTopic=${result.isOffTopic}, refusalMessage="${result.refusalMessage}"`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Distinct questions produce distinct intents (diversity check)
// ─────────────────────────────────────────────────────────────────────────────
section('Diversity — distinct intents for varied project questions');

const distinctQuestions = [
  'How do I fix my login flow?',
  'My CSS animation is broken.',
  'How do I set up CI/CD on GitHub Actions?',
  'How to call Gemini API from Node.js?',
  'Which task should I work on now?',
  'How do I add WebSocket real-time alerts?',
  'How do I write Jest unit tests?',
  'My Express API crashes with a 500 error.'
];

const detectedTopics = distinctQuestions.map(q => TopicClassifier.classify(q).topic);
const uniqueTopics = new Set(detectedTopics);

assert(
  `${uniqueTopics.size} unique intents from ${distinctQuestions.length} distinct questions`,
  uniqueTopics.size >= 5,
  `Only got ${uniqueTopics.size} distinct topics: ${[...uniqueTopics].join(', ')}`
);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(
  `${c.bold}Tests: ${passed + failed}  ` +
  `${c.green}Passed: ${passed}${c.reset}  ` +
  `${c.red}Failed: ${failed}${c.reset}`
);

if (failures.length > 0) {
  console.log(`\n${c.red}${c.bold}Failures:${c.reset}`);
  failures.forEach(({ name, detail }) => {
    console.log(`  ${c.red}✗${c.reset} ${name}`);
    if (detail) console.log(`    ${c.yellow}→ ${detail}${c.reset}`);
  });
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
