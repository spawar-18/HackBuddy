const SmartContextBuilder = require('./SmartContextBuilder');
const ContextBuilder = require('./ContextBuilder');
const PromptManager = require('./PromptManager');
const AIProviderManager = require('./AIProviderManager');
const ResponseValidator = require('./responseValidator');
const FallbackManager = require('./FallbackManager');
const MemoryManager = require('./MemoryManager');
const ResponseCacheService = require('./ResponseCacheService');
const MentorRouter = require('./MentorRouter');
const LoggingService = require('./loggingService');
const { getModuleConfig } = require('./aiModuleConfig');

/**
 * AIOrchestrator
 * Single production entry point for provider routing, prompt construction,
 * context injection, retries, fallbacks, caching, validation, telemetry,
 * latency tracking, and memory side effects.
 */
class AIOrchestrator {
  async execute({ projectId, module, userInput, bypassCache = false, history = [], members = [], metadata = {} }) {
    const startedAt = Date.now();
    const moduleConfig = getModuleConfig(module);
    const conversationId = metadata.conversationId || `${projectId || 'global'}_${Date.now()}`;

    let projectContext = '';
    let memory = null;
    let mentorMeta = null;

    if (projectId) {
      if (module === 'chatWithMentor') {
        try {
          const smartContext = await SmartContextBuilder.buildContext(projectId, userInput);
          mentorMeta = {
            topic: smartContext.topic,
            contextSections: smartContext.sectionsUsed || [],
            conversationId
          };

          if (smartContext.isOffTopic) {
            return this.buildMentorResponse({
              answer: smartContext.refusalMessage,
              confidence: 100,
              recommendations: [],
              followUpActions: [
                'Ask about your current project architecture',
                'Ask how to deploy your MERN stack',
                'Ask how to improve your task splitter'
              ],
              relatedTasks: [],
              provider: 'HackBuddy',
              fallbackProvider: null,
              promptVersion: '3.0.0',
              latencyMs: Date.now() - startedAt,
              cacheHit: false,
              topic: smartContext.topic,
              contextSections: [],
              conversationId
            });
          }

          projectContext = smartContext.contextText;
        } catch (contextErr) {
          console.warn(`[AIOrchestrator] Smart context build failed: ${contextErr.message}`);
          projectContext = await ContextBuilder.buildContext(projectId, bypassCache);
        }

        try {
          memory = await MemoryManager.getMemory(projectId);
        } catch (memoryErr) {
          console.warn(`[AIOrchestrator] Mentor memory unavailable: ${memoryErr.message}`);
        }
      } else if (['extractMentorMemory', 'extractSkills'].includes(module)) {
        projectContext = '';
      } else {
        try {
          projectContext = await ContextBuilder.buildContext(projectId, bypassCache);
        } catch (contextErr) {
          console.warn(`[AIOrchestrator] Context build failed for ${module}: ${contextErr.message}`);
        }
      }
    }

    const payload = PromptManager.buildPrompt(module, {
      projectContext,
      userInput,
      history,
      memory,
      metadata
    });

    const cacheKey = ResponseCacheService.createKey({
      module,
      projectId,
      userInput,
      promptVersion: payload.promptVersion
    });

    if (!bypassCache && moduleConfig.cacheTtlMs > 0) {
      const cached = ResponseCacheService.get(cacheKey);
      if (cached) {
        console.log(`[AIOrchestrator] Cache hit for ${module}`);
        if (module === 'chatWithMentor' && typeof cached === 'object') {
          return { ...cached, cacheHit: true };
        }
        return cached;
      }
    }

    let finalResult;
    let failed = false;
    let providerUsed = null;
    let fallbackProvider = null;

    const route = module === 'chatWithMentor' && mentorMeta?.topic
      ? MentorRouter.getRoute(mentorMeta.topic)
      : moduleConfig.route;

    try {
      const providerResult = await AIProviderManager.executeWithRouting(payload, {
        module,
        route,
        timeoutMs: moduleConfig.timeoutMs,
        maxRetries: moduleConfig.maxRetries,
        validate: (text) => ResponseValidator.validateOrThrow(text, module)
      });
      finalResult = providerResult.normalized;
      providerUsed = providerResult.providerUsed;
      fallbackProvider = route[0] !== providerResult.providerUsed
        ? MentorRouter.getProviderLabel(route[0])
        : null;
    } catch (pipelineErr) {
      failed = true;
      console.error(`[AIOrchestrator] Provider pipeline exhausted for ${module}: ${pipelineErr.message}`);

      const fallbackResult = FallbackManager.getFallbackResponse(module, userInput, {
        projectContext,
        members
      });

      finalResult = typeof fallbackResult === 'object'
        ? ResponseValidator.normalizeObject(fallbackResult, module)
        : ResponseValidator.validateAndNormalize(fallbackResult, module);
    }

    if (!failed && moduleConfig.cacheTtlMs > 0) {
      ResponseCacheService.set(cacheKey, finalResult, moduleConfig.cacheTtlMs);
    }

    const latencyMs = Date.now() - startedAt;

    if (module === 'chatWithMentor') {
      const mentorPayload = ResponseValidator.normalizeMentorResponse(finalResult);
      const response = this.buildMentorResponse({
        ...mentorPayload,
        provider: MentorRouter.getProviderLabel(providerUsed || 'FallbackManager'),
        fallbackProvider,
        promptVersion: payload.promptVersion,
        latencyMs,
        cacheHit: false,
        topic: mentorMeta?.topic || 'general_project',
        contextSections: mentorMeta?.contextSections || [],
        conversationId
      });

      LoggingService.logCall({
        module,
        projectId,
        userId: metadata.userId || null,
        provider: response.provider,
        latencyMs,
        topic: response.topic,
        contextSections: response.contextSections,
        promptVersion: response.promptVersion,
        conversationId,
        success: !failed,
        cacheHit: Boolean(response.cacheHit),
        confidence: response.confidence,
        responseLength: response.answer ? response.answer.length : 0
      });

      if (!failed && projectId) {
        MemoryManager.extractAndAddMemory(
          projectId,
          typeof userInput === 'string' ? userInput : JSON.stringify(userInput),
          response.answer,
          (params) => this.execute({ projectId, ...params })
        ).catch((memErr) => {
          console.error('[AIOrchestrator] Background memory extraction failed:', memErr.message);
        });
      }

      console.log(`[AIOrchestrator] ${module} completed in ${latencyMs}ms`);
      return response;
    }

    console.log(`[AIOrchestrator] ${module} completed in ${latencyMs}ms`);
    return finalResult;
  }

  buildMentorResponse({
    answer,
    confidence = 75,
    recommendations = [],
    followUpActions = [],
    relatedTasks = [],
    provider = 'Gemini',
    fallbackProvider = null,
    promptVersion = '3.0.0',
    latencyMs = 0,
    cacheHit = false,
    topic = 'general_project',
    contextSections = [],
    conversationId = null
  }) {
    return {
      answer,
      confidence,
      recommendations,
      followUpActions,
      relatedTasks,
      provider,
      fallbackProvider,
      promptVersion,
      latencyMs,
      cacheHit,
      topic,
      contextSections,
      conversationId
    };
  }
}

module.exports = new AIOrchestrator();
