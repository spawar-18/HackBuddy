const { GoogleGenAI } = require('@google/genai');
const loggingService = require('./loggingService');

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 30000; // 30 seconds

// Schemas for structured output validation
const SCHEMAS = {
  extractSkills: {
    type: 'object',
    properties: {
      skills: { type: 'array', items: { type: 'string' } }
    },
    required: ['skills']
  },

  analyzeTeam: {
    type: 'object',
    properties: {
      readinessScore: { type: 'number' },
      strengths: { type: 'array', items: { type: 'string' } },
      skillGaps: { type: 'array', items: { type: 'string' } },
      recommendedRoles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            member: { type: 'string' },
            role: { type: 'string' }
          },
          required: ['member', 'role']
        }
      }
    },
    required: ['readinessScore', 'strengths', 'skillGaps', 'recommendedRoles']
  },

  analyzeProject: {
    type: 'object',
    properties: {
      feasibilityScore: { type: 'number' },
      problemSolutionAlignment: { type: 'string' },
      projectRisks: { type: 'array', items: { type: 'string' } },
      missingSkills: { type: 'array', items: { type: 'string' } },
      mustBuildFeatures: { type: 'array', items: { type: 'string' } },
      optionalFeatures: { type: 'array', items: { type: 'string' } },
      featuresToRemove: { type: 'array', items: { type: 'string' } },
      improvementSuggestions: { type: 'array', items: { type: 'string' } },
      reasoning: { type: 'string' },
      judgePerspective: { type: 'string' },
      executionStrategy: { type: 'array', items: { type: 'string' } }
    },
    required: [
      'feasibilityScore', 'problemSolutionAlignment', 'projectRisks', 'missingSkills',
      'mustBuildFeatures', 'optionalFeatures', 'featuresToRemove', 'improvementSuggestions',
      'reasoning', 'judgePerspective', 'executionStrategy'
    ]
  },

  generateTaskPlan: {
    type: 'object',
    properties: {
      projectTasks: {
        type: 'object',
        properties: {
          coreFeatures: { type: 'array', items: { type: 'string' } },
          technicalTasks: { type: 'array', items: { type: 'string' } },
          deploymentTasks: { type: 'array', items: { type: 'string' } }
        },
        required: ['coreFeatures', 'technicalTasks', 'deploymentTasks']
      },
      assignments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            member: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            assignedTasks: { type: 'array', items: { type: 'string' } },
            reason: { type: 'string' }
          },
          required: ['member', 'skills', 'assignedTasks', 'reason']
        }
      },
      workloadDistribution: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            member: { type: 'string' },
            percentage: { type: 'number' }
          },
          required: ['member', 'percentage']
        }
      },
      executionOrder: { type: 'array', items: { type: 'string' } },
      criticalTasks: { type: 'array', items: { type: 'string' } },
      recommendedFocus: { type: 'array', items: { type: 'string' } },
      warnings: { type: 'array', items: { type: 'string' } }
    },
    required: [
      'projectTasks', 'assignments', 'workloadDistribution', 'executionOrder',
      'criticalTasks', 'recommendedFocus', 'warnings'
    ]
  },

  getMarketplaceRecommendation: {
    type: 'object',
    properties: {
      recommendation: { type: 'string', enum: ['Approve', 'Reject'] },
      confidenceScore: { type: 'number' },
      reason: { type: 'string' }
    },
    required: ['recommendation', 'confidenceScore', 'reason']
  },

  analyzeTechStack: {
    type: 'object',
    properties: {
      readinessScore: { type: 'number' },
      consensusScore: { type: 'number' },
      strengths: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
      recommendedChanges: { type: 'array', items: { type: 'string' } },
      recommendedStack: {
        type: 'object',
        properties: {
          frontend: { type: 'array', items: { type: 'string' } },
          backend: { type: 'array', items: { type: 'string' } },
          database: { type: 'array', items: { type: 'string' } },
          ai: { type: 'array', items: { type: 'string' } },
          deployment: { type: 'array', items: { type: 'string' } }
        },
        required: ['frontend', 'backend', 'database', 'ai', 'deployment']
      },
      reasoning: { type: 'string' },
      finalRecommendation: { type: 'string' }
    },
    required: [
      'readinessScore', 'consensusScore', 'strengths', 'risks', 'recommendedChanges',
      'recommendedStack', 'reasoning', 'finalRecommendation'
    ]
  },

  analyzeHackathonCommandCenter: {
    type: 'object',
    properties: {
      overallStatus: { type: 'string' },
      riskLevel: { type: 'string' },
      completionPrediction: { type: 'string' },
      currentFocus: { type: 'array', items: { type: 'string' } },
      tasksToPostpone: { type: 'array', items: { type: 'string' } },
      reasoning: { type: 'string' },
      judgePreparationTips: { type: 'array', items: { type: 'string' } },
      executionStrategy: { type: 'array', items: { type: 'string' } }
    },
    required: [
      'overallStatus', 'riskLevel', 'completionPrediction', 'currentFocus',
      'tasksToPostpone', 'reasoning', 'judgePreparationTips', 'executionStrategy'
    ]
  },

  analyzeGitHubRepository: {
    type: 'object',
    properties: {
      repositoryHealth: { type: 'string' },
      developmentStatus: { type: 'string' },
      documentationStatus: { type: 'string' },
      testingStatus: { type: 'string' },
      deploymentStatus: { type: 'string' },
      inactiveMembers: { type: 'array', items: { type: 'string' } },
      missingComponents: { type: 'array', items: { type: 'string' } },
      repositoryWarnings: { type: 'array', items: { type: 'string' } },
      recommendations: { type: 'array', items: { type: 'string' } },
      reasoning: { type: 'string' }
    },
    required: [
      'repositoryHealth', 'developmentStatus', 'documentationStatus', 'testingStatus',
      'deploymentStatus', 'inactiveMembers', 'missingComponents', 'repositoryWarnings',
      'recommendations', 'reasoning'
    ]
  }
};

let aiClientInstance = null;

const getAiClient = () => {
  if (aiClientInstance) return aiClientInstance;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API;
  if (!apiKey) {
    console.error('CRITICAL: Neither GEMINI_API_KEY nor GEMINI_API env variable is defined.');
  }
  aiClientInstance = new GoogleGenAI({ apiKey });
  return aiClientInstance;
};

/**
 * Timeout helper for promises
 */
const withTimeout = (promise, timeoutMs) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`AI execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([
    promise.then(res => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

/**
 * Executes a text or structured prompt to the Gemini API with retries and timeout
 * @param {object} options - Call options
 * @param {string|Array} options.contents - The messages or prompt string
 * @param {string} options.systemInstruction - Developer instructions
 * @param {string} [options.schemaName] - Predefined schema name for structured output
 * @param {boolean} [options.isJson=false] - Whether JSON mime type is required
 * @param {number} [options.temperature] - Model temperature override
 * @param {string} [options.promptVersion='1.0.0'] - Prompt version tracking identifier
 * @param {string} [options.endpointName='unknown'] - Endpoint name for logs
 * @returns {Promise<string>} Raw text response from the model
 */
const executePrompt = async ({
  contents,
  systemInstruction,
  schemaName,
  isJson = false,
  temperature,
  promptVersion = '1.0.0',
  endpointName = 'unknown'
}) => {
  const client = getAiClient();
  const model = DEFAULT_MODEL;
  
  let attempt = 0;
  let delay = BASE_DELAY_MS;
  const start = Date.now();

  const config = {
    temperature: temperature !== undefined ? temperature : (isJson ? 0.0 : 0.2),
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  if (isJson) {
    config.responseMimeType = 'application/json';
    if (schemaName && SCHEMAS[schemaName]) {
      config.responseSchema = SCHEMAS[schemaName];
    }
  }

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const apiCallPromise = client.models.generateContent({
        model,
        contents,
        config
      });

      const response = await withTimeout(apiCallPromise, TIMEOUT_MS);
      const latencyMs = Date.now() - start;

      const tokenUsage = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      };

      loggingService.logCall({
        modelName: model,
        promptVersion,
        latencyMs,
        tokenUsage,
        errors: null,
        retries: attempt - 1,
        endpoint: endpointName
      });

      return response.text;
    } catch (err) {
      console.warn(`[GeminiService] Attempt ${attempt} failed for ${endpointName}: ${err.message}`);
      
      const status = err.status || (err.response && err.response.status);
      const isRateLimit = status === 429 || err.message.includes('429') || err.message.includes('Quota exceeded');
      const isTransient = isRateLimit || status >= 500 || err.message.includes('timeout') || err.message.includes('FetchError');

      if (!isTransient || attempt >= MAX_RETRIES) {
        const latencyMs = Date.now() - start;
        loggingService.logCall({
          modelName: model,
          promptVersion,
          latencyMs,
          errors: err.message,
          retries: attempt - 1,
          endpoint: endpointName
        });
        throw err;
      }

      const jitter = Math.random() * 200;
      console.log(`[GeminiService] Transient error detected. Retrying in ${delay + jitter}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      delay *= 2;
    }
  }
};

module.exports = {
  executePrompt,
  SCHEMAS
};
