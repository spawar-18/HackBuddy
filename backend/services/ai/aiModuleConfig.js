/**
 * Enterprise AI module registry.
 * Keeps provider routing, cache policy, and feature taxonomy outside the
 * orchestrator so new modules can be added without changing execution logic.
 */
const PROVIDERS = {
  GLM: 'GLMProvider',
  DEEPSEEK: 'DeepSeekProvider',
  GEMINI: 'GeminiProvider'
};

const MODULE_CONFIG = {
  analyzeProject: {
    feature: 'Project Review',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 24 * 60 * 60 * 1000,
    timeoutMs: 45000,
    maxRetries: 1
  },
  chatWithMentor: {
    feature: 'Mentor',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 0,
    timeoutMs: 30000,
    maxRetries: 1
  },
  generateTaskPlan: {
    feature: 'Task Splitter',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 0,
    timeoutMs: 45000,
    maxRetries: 1
  },
  analyzeTechStack: {
    feature: 'Stack Consensus',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 0,
    timeoutMs: 45000,
    maxRetries: 1
  },
  analyzeHackathonCommandCenter: {
    feature: 'Command Center',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 60 * 1000,
    timeoutMs: 30000,
    maxRetries: 1
  },
  analyzeGitHubRepository: {
    feature: 'GitHub Analysis',
    route: [PROVIDERS.DEEPSEEK, PROVIDERS.GEMINI, PROVIDERS.GLM],
    cacheTtlMs: 30 * 60 * 1000,
    timeoutMs: 45000,
    maxRetries: 1
  },
  verifyTaskWithAI: {
    feature: 'Repository Code Review',
    route: [PROVIDERS.DEEPSEEK, PROVIDERS.GEMINI, PROVIDERS.GLM],
    cacheTtlMs: 0,
    timeoutMs: 30000,
    maxRetries: 1
  },
  analyzeTeam: {
    feature: 'Team Analysis',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 12 * 60 * 60 * 1000,
    timeoutMs: 30000,
    maxRetries: 1
  },
  getMarketplaceRecommendation: {
    feature: 'Marketplace',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 0,
    timeoutMs: 30000,
    maxRetries: 1
  },
  winningProbability: {
    feature: 'Technical Reasoning',
    route: [PROVIDERS.DEEPSEEK, PROVIDERS.GEMINI, PROVIDERS.GLM],
    cacheTtlMs: 0,
    timeoutMs: 30000,
    maxRetries: 1
  },
  extractSkills: {
    feature: 'General Backup',
    route: [PROVIDERS.GEMINI, PROVIDERS.GLM, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 0,
    timeoutMs: 30000,
    maxRetries: 1
  },
  extractMentorMemory: {
    feature: 'Mentor Memory',
    route: [PROVIDERS.GLM, PROVIDERS.GEMINI, PROVIDERS.DEEPSEEK],
    cacheTtlMs: 0,
    timeoutMs: 30000,
    maxRetries: 1
  }
};

const DEFAULT_CONFIG = {
  feature: 'General Backup',
  route: [PROVIDERS.GEMINI, PROVIDERS.GLM, PROVIDERS.DEEPSEEK],
  cacheTtlMs: 0,
  timeoutMs: 30000,
  maxRetries: 1
};

module.exports = {
  PROVIDERS,
  MODULE_CONFIG,
  DEFAULT_CONFIG,
  getModuleConfig(moduleName) {
    return MODULE_CONFIG[moduleName] || DEFAULT_CONFIG;
  }
};
