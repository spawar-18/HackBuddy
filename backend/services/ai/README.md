# HackBuddy AI Platform

This directory contains the unified HackBuddy AI platform. All AI features must enter through `AIEngine.executeAI`, which delegates to `AIOrchestrator`.

## Request Flow

1. `AIEngine` preserves the existing controller/service API.
2. `AIOrchestrator` builds project context, mentor memory, prompt payloads, cache keys, and provider execution policy.
3. `PromptManager` composes system, developer, context, memory, history, and current user request blocks from versioned prompt definitions.
4. `AIProviderManager` routes by module, retries on transient or validation failures, records telemetry, and falls through to backup providers.
5. `responseValidator` repairs JSON, rejects malformed or schema-invalid output during provider execution, and normalizes successful JSON for existing frontend contracts.
6. `FallbackManager` returns schema-safe local fallbacks when every provider fails.

## Routing Policy

- Project Review, Mentor, Task Splitter, Stack Consensus, Command Center, Team Analysis: GLM -> Gemini -> DeepSeek
- GitHub Analysis, Repository Code Review, Technical Reasoning: DeepSeek -> Gemini -> GLM
- Vision and general backup modules: Gemini first

Provider switches are internal. Controllers and frontend components receive the same response contracts they used before.

## Cache Policy

- Project Review: 24 hours
- Team Analysis: 12 hours
- GitHub Analysis: 30 minutes
- Command Center: 60 seconds
- Mentor: no response cache

Context caching remains separate in `CacheManager`.

## Prompt Versioning

Prompt metadata is managed by `promptVersionManager` and includes:

- `id`
- `version`
- `module`
- `createdAt`
- `updatedAt`
- `expectedSchema`
- `qualityScore`

Do not duplicate prompt text in controllers. Add or update module prompts in `promptVersionManager`, then register routing/cache policy in `aiModuleConfig`.

## Validation

AI output is never trusted directly. Structured modules must return JSON matching their registered schema. The provider manager retries and fails over when output is empty, malformed, missing required fields, or contains unsupported top-level keys. The mentor module is validated as JSON internally, then unwrapped to the legacy chat string response so existing APIs do not break.

## Telemetry

Each provider attempt logs:

- provider
- model
- latency
- token estimate
- retries
- cost estimate
- fallback status
- module/endpoint
- duration
- errors

Logs are appended to `backend/persistent_calls.log`.
