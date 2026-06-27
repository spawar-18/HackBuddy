const OFF_TOPIC_KEYWORDS = [
  'weather', 'recipe', 'cooking', 'movie', 'netflix', 'football', 'cricket',
  'politics', 'election', 'dating', 'relationship advice', 'horoscope',
  'stock market', 'crypto price', 'bitcoin price', 'celebrity', 'gossip',
  'poem', 'poetry', 'quantum mechanics', 'quantum entanglement', 'quantum physics',
  'philosophy', 'dinosaur', 'history of', 'ancient history', 'geography',
  'meaning of life', 'capital of', 'write me a story', 'tell me a joke', 'a joke',
  'essay on', 'explain string theory', 'climate change', 'biology lesson',
  'astronomy', 'entanglement', 'universe origin', 'religion', 'explain god',
  'french revolution', 'world war', 'who invented', 'what country', 'what language'
];

const DEV_KEYWORDS = [
  'project', 'feature', 'hackathon', 'code', 'api call', 'deploy', 'github', 'task',
  'react', 'node.js', 'mongo', 'auth', 'bug', 'error', 'architecture',
  'demo', 'pitch', 'judge', 'team', 'score', 'review', 'improve', 'build',
  'fix', 'debug', 'stack', 'mentor', 'splitter', 'marketplace', 'command center',
  'integrate', 'implementation', 'backend', 'frontend', 'database', 'server',
  'middleware', 'endpoint', 'component', 'service', 'testing', 'render.com',
  'vercel', 'netlify', 'openrouter', 'gemini', 'glm', 'deepseek', 'jwt', 'oauth',
  'express', 'mongoose', 'mongodb', 'vite', 'docker', 'pipeline', 'security',
  'codebase', 'function', 'module', 'class', 'object', 'variable', 'algorithm',
  'async', 'await', 'promise', 'callback', 'json', 'http', 'rest api', 'graphql'
];

// ORDER MATTERS: more specific topics first so they win scoring ties over generic ones
const TOPIC_RULES = [
  // Specific AI providers — must be BEFORE backend so openrouter/gemini win
  {
    topic: 'ai_integration',
    keywords: ['openrouter', 'gemini', 'glm', 'deepseek', 'featherless', 'openai',
               'anthropic', 'prompt engineering', 'llm', 'rag', 'vector', 'ai provider',
               'ai integration', 'ai pipeline', 'language model', 'ai api', 'ai model',
               'integrate ai', 'ai service', 'token limit', 'context window']
  },
  { topic: 'authentication', keywords: ['auth', 'jwt', 'oauth', 'login', 'signup', 'token', 'session', 'google login', 'github login', 'bcrypt', 'passport', 'signout', 'password', 'credential', 'refresh token', 'access token'] },
  { topic: 'deployment',    keywords: ['deploy', 'deployment', 'render', 'netlify', 'vercel', 'docker', 'production', 'hosting', 'ci/cd', 'pipeline', 'environment variable', 'port', 'nginx', 'heroku', 'railway', 'cold start'] },
  { topic: 'github',        keywords: ['github', 'repo', 'repository', 'commit', 'branch', 'pull request', 'pr #', 'merge', 'contributor', 'git push', 'git clone', 'git pull'] },
  { topic: 'database',      keywords: ['mongodb', 'database', 'schema', 'collection', 'index', 'mongoose', 'atlas', 'aggregate', 'nosql', 'postgres', 'mysql', 'db query', 'db schema', 'data model'] },
  { topic: 'marketplace',   keywords: ['marketplace', 'claim task', 'swap task', 'reassign', 'request task', 'bounty', 'task request'] },
  { topic: 'command_center',keywords: ['command center', 'hackathon status', 'velocity', 'critical path', 'blocked task', 'burndown', 'time remaining', 'hackathon timer', 'progress report'] },
  { topic: 'project_review',keywords: ['project review', 'feasibility check', 'review feedback', 'audit project', 'review score', 'ai review', 'project score'] },
  { topic: 'tasks',         keywords: ['task splitter', 'task plan', 'task assignment', 'workload', 'sprint', 'epic', 'deliverable', 'assigned task', 'task status', 'todo list'] },
  { topic: 'architecture',  keywords: ['architecture', 'system design', 'scalability', 'microservice', 'monolith', 'design pattern', 'refactor', 'modular design', 'separation of concerns', 'service layer'] },
  { topic: 'performance',   keywords: ['performance', 'optimization', 'latency', 'slow response', 'cache', 'memory leak', 'optimize', 'benchmark', 'load time'] },
  { topic: 'security',      keywords: ['security', 'xss', 'csrf', 'sanitize input', 'helmet', 'vulnerability', 'injection', 'encryption', 'ssl', 'rate limit', 'hashing'] },
  { topic: 'notifications', keywords: ['notification', 'push notification', 'email alert', 'websocket', 'socket.io', 'real-time alert', 'live update'] },
  { topic: 'testing',       keywords: ['unit test', 'integration test', 'e2e test', 'jest', 'cypress', 'mocha', 'chai', 'test suite', 'test case', 'test coverage'] },
  { topic: 'ui',            keywords: ['screenshot', 'mockup', 'wireframe', 'design review', 'tailwind', 'css styling', 'ui design', 'ux design', 'component styling', 'sass', 'dark mode', 'responsive design'] },
  { topic: 'frontend',      keywords: ['react', 'vite', 'react component', 'react hook', 'frontend', 'state management', 'redux', 'props', 'useeffect', 'usestate', 'client side', 'browser rendering'] },
  { topic: 'debugging',     keywords: ['debug', 'bug fix', 'error fix', 'crash', 'exception', 'stack trace', 'failing test', 'broken feature', 'console error', 'warn', 'traceback', 'runtime error', 'express error', 'node error', 'cannot read property', 'undefined is not', 'typeerror', 'syntaxerror', 'how to debug', 'debug this', 'debugging this', 'fix this error', 'getting an error', 'seeing an error', 'what is this error'] },
  // Generic backend last — broad terms that shouldn't override specific AI topics
  { topic: 'backend',       keywords: ['node.js', 'express.js', 'express route', 'controller', 'middleware', 'route handler', 'rest api', 'server error', 'http request', 'backend logic'] }
];

const REFUSAL_MESSAGE = `I'm HackBuddy's AI Project Mentor — exclusively focused on your project's software engineering, architecture, and execution. I can't help with non-project topics. Try asking about your current feature, deployment setup, GitHub activity, debugging, or hackathon strategy.`;

class TopicClassifier {
  classify(question = '') {
    const text = String(question).toLowerCase().trim();
    if (!text) {
      return { topic: 'general_project', isOffTopic: false };
    }

    // 1. Check explicit off-topic blocklist
    const isClearlyOffTopic = OFF_TOPIC_KEYWORDS.some((keyword) => text.includes(keyword));

    // 2. Check if any dev keyword or topic rule keyword is present
    const hasDevKeyword = DEV_KEYWORDS.some((keyword) => text.includes(keyword));
    const hasTopicKeyword = TOPIC_RULES.some((rule) =>
      rule.keywords.some((keyword) => text.includes(keyword))
    );
    const isDevRelated = hasDevKeyword || hasTopicKeyword;

    if (isClearlyOffTopic && !isDevRelated) {
      return { topic: 'off_topic', isOffTopic: true, refusalMessage: REFUSAL_MESSAGE };
    }

    // 3. Score each topic
    let bestTopic = 'general_project';
    let bestScore = 0;

    for (const rule of TOPIC_RULES) {
      let score = 0;
      for (const keyword of rule.keywords) {
        if (text.includes(keyword)) {
          // Longer, more specific keywords get extra weight
          score += keyword.length > 8 ? 2 : 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestTopic = rule.topic;
      }
    }

    // 4. If no topic matched at all, fallback to general_project
    return {
      topic: bestTopic,
      isOffTopic: false
    };
  }
}

module.exports = new TopicClassifier();
