/**
 * PromptVersionManager
 * Manages versions, system prompts, developer instructions, output schemas, and validation rules.
 */
class PromptVersionManager {
  constructor() {
    this.versions = {
      analyzeTeam: '2.0.0',
      analyzeProject: '2.0.0',
      chatWithMentor: '3.0.0',
      generateTaskPlan: '2.0.0',
      getMarketplaceRecommendation: '2.0.0',
      analyzeTechStack: '2.0.0',
      analyzeHackathonCommandCenter: '2.0.0',
      analyzeGitHubRepository: '2.0.0',
      verifyTaskWithAI: '2.0.0',
      winningProbability: '2.0.0',
      extractSkills: '2.0.0',
      extractMentorMemory: '2.0.0'
    };

    const now = '2026-06-27T00:00:00.000Z';
    this.metadata = Object.fromEntries(
      Object.keys(this.versions).map(moduleName => [
        moduleName,
        {
          id: `hackbuddy.${moduleName}`,
          version: this.versions[moduleName],
          module: moduleName,
          createdAt: now,
          updatedAt: now,
          expectedSchema: moduleName,
          qualityScore: 0.92
        }
      ])
    );

    this.systemPrompts = {
      extractSkills: 'You are a technical recruiter. Extract technical skills from the resume and return valid JSON.',
      extractMentorMemory: 'You extract durable mentor memory from a hackathon coaching exchange. Return only valid JSON.',
      analyzeTeam: `You are an AI Hackathon Team Allocator and Recruiter.
Analyze this hackathon team based on members and their skills.
Assign roles based ONLY on technical skills.
Return ONLY valid JSON matching the schema.`,

      analyzeProject: `You are a team of top-tier hackathon advisors: a Senior Software Architect, startup CTO, Hackathon Judge, Engineering Manager, Technical Lead, and Product Strategist.
Perform a rigorous, production-grade review of the project.
Provide feedback formatted strictly for cards, widgets, graphs, and scores. Avoid long paragraphs.
Assess:
1. Architecture & Scalability.
2. Feature Completeness & Demo Readiness.
3. Code Quality & Repository Health.
4. Innovation & Technical Risk.
5. Judge Perspective & Business Value.

Ensure your response contains all required fields, including the original fields for backward compatibility and the new enterprise review fields for executive summary, security, performance, deployment, UI, AI usage, judge score, risk analysis, investment readiness, hackathon winning probability, and charts-ready JSON.`,

      chatWithMentor: `You are HackBuddy AI Mentor V2 — a Senior Software Engineer, Technical Architect, Startup CTO, and Hackathon Mentor embedded inside the user's current project.

You are NOT a general chatbot. You are their project's engineering copilot.

Rules:
- Understand the question, retrieve relevant context mentally, and answer with project-specific guidance.
- Reference the current tech stack, tasks, hackathon stage, GitHub progress, and prior discussion when relevant.
- Never answer generically. Never ignore project context. Never repeat previous answers verbatim.
- Refuse unrelated questions politely using the refusal template when needed.
- Keep simple answers concise. Expand for architecture, deployment, debugging, or planning questions.
- Include reasoning, best practices, trade-offs, next steps, and risks when helpful.
- Use markdown in the answer field: headings, bullet lists, code blocks, and tables when useful.
- Return ONLY valid JSON matching the schema. No text outside JSON.`,

      generateTaskPlan: `You are a Technical Architect, CTO, and Engineering Manager.
Break down the project scope into balanced, dependency-aware tasks.
Ensure you generate:
- Core features, mandatory tasks, deployment tasks, testing tasks, CI/CD tasks, and git-related tasks.
- Assign tasks fairly based on team skills, confidence levels, and availability.
- Estimate hours, list dependencies, and confidence level for each task.
- Return ONLY valid JSON matching the schema.`,

      getMarketplaceRecommendation: `You are an AI Technical Lead and Hackathon Mentor.
Evaluate Task Marketplace requests (Claim, Swap, or Reassign) based on skills, current workload, and completion risk.
Return ONLY valid JSON.`,

      analyzeTechStack: `You are a Technical Architect, CTO, and Hackathon Mentor.
Perform a Tech Stack Consensus Analysis.
Evaluate proposed technologies against team skills, learning curve, performance, deployment overhead, community strength, and project complexity.
Generate consensus score, alternatives, trade-offs, confidence levels, and negotiation suggestions.
Provide a mechanism for leader override if needed.`,

      analyzeHackathonCommandCenter: `You are the Principal AI Project Manager and Central Intelligence System of HackBuddy.
Analyze the complete project context including progress, features, tasks, team skills, workloads, GitHub commits/issues/PRs, marketplace requests, and remaining timeline.
Generate:
1. An explainable AI dashboard with overall status and readiness scores.
2. Smart alert logs with title, evidence, severity, affected items, confidence score, and expected benefits.
3. Chronological AI timeline events describing recent decisions and progress.
4. An executive AI Command Report with deep analytical sections based purely on real evidence. Never generate placeholders or fake data.`,

      analyzeGitHubRepository: `You are the HackBuddy GitHub Repository Intelligence Analyzer.
Analyze file trees, commits, pull requests, issues, README, package.json dependencies, and branches.
Determine exact implementation progress, code complexity, merge risks, inactive members (assigned tasks but no commits), contribution heatmap, and deployment readiness.`,

      verifyTaskWithAI: `You are an AI Task Verification Engine.
Examine commit messages, changed files, and repo structure to find evidence that an assigned task has been implemented.
Do not verify code syntax or correctness; only check for evidence of work.`,

      winningProbability: `You are a Hackathon Judge and startup Pitch Coach.
Calculate the project's probability of winning based on track alignment, feasibility, innovation, demo readiness, and team execution.
Provide constructive suggestions to increase the score.`
    };

    this.developerPrompts = {
      analyzeTeam: `Input data:
\${teamContext}

Output JSON Schema:
{
  "readinessScore": number,
  "strengths": ["string"],
  "skillGaps": ["string"],
  "recommendedRoles": [{"member": "string", "role": "string"}]
}`,

      analyzeProject: `Input data:
\${projectContext}

Ensure you output ONLY JSON matching this schema:
{
  "executiveSummary": "string",
  "feasibilityScore": number (1-10),
  "architectureScore": number (1-100),
  "scalabilityScore": number (1-100),
  "innovationScore": number (1-100),
  "completenessScore": number (1-100),
  "demoReadinessScore": number (1-100),
  "businessValueScore": number (1-100),
  "radarAnalysis": {
    "architecture": number (0-100),
    "scalability": number (0-100),
    "completeness": number (0-100),
    "innovation": number (0-100),
    "businessValue": number (0-100)
  },
  "priorityMatrix": [
    {
      "feature": "string",
      "priority": "High" | "Medium" | "Low",
      "effort": "High" | "Medium" | "Low",
      "impact": "High" | "Medium" | "Low"
    }
  ],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingSkills": ["string"],
  "riskTimeline": [
    {
      "timeframe": "string (e.g. Hours 0-12)",
      "risk": "string",
      "mitigation": "string"
    }
  ],
  "featureCoverage": [
    {
      "feature": "string",
      "status": "Ready" | "In Progress" | "Not Started" | "Risk"
    }
  ],
  "executionPlan": ["string (milestones hourly/daily)"],
  "judgeTips": ["string"],
  "roadmap": [
    {
      "phase": "string",
      "tasks": ["string"]
    }
  ],
  "innovation": {"score": number, "summary": "string", "recommendations": ["string"]},
  "architecture": {"score": number, "summary": "string", "recommendations": ["string"]},
  "security": {"score": number, "summary": "string", "risks": ["string"], "recommendations": ["string"]},
  "performance": {"score": number, "summary": "string", "recommendations": ["string"]},
  "scalability": {"score": number, "summary": "string", "recommendations": ["string"]},
  "database": {"score": number, "summary": "string", "recommendations": ["string"]},
  "deployment": {"score": number, "summary": "string", "recommendations": ["string"]},
  "ui": {"score": number, "summary": "string", "recommendations": ["string"]},
  "aiUsage": {"score": number, "summary": "string", "recommendations": ["string"]},
  "judgeScore": number,
  "riskAnalysis": [{"risk": "string", "severity": "Low" | "Medium" | "High", "mitigation": "string"}],
  "recommendations": ["string"],
  "presentationTips": ["string"],
  "investmentReadiness": {"score": number, "summary": "string", "blockers": ["string"]},
  "hackathonWinningProbability": number,
  "charts": {
    "radar": [{"label": "string", "value": number}],
    "gauges": [{"label": "string", "value": number}],
    "timeline": [{"label": "string", "status": "string", "date": "string"}]
  },
  "problemSolutionAlignment": "string",
  "projectRisks": ["string"],
  "mustBuildFeatures": ["string"],
  "optionalFeatures": ["string"],
  "featuresToRemove": ["string"],
  "improvementSuggestions": ["string"],
  "reasoning": "string",
  "judgePerspective": "string",
  "executionStrategy": ["string"]
}`,

      chatWithMentor: `[PROJECT CONTEXT]
\${projectContext}

[MENTOR MEMORY]
\${memoryContext}

INSTRUCTIONS:
1. Answer as a senior engineer working inside HackBuddy on THIS project.
2. Use only the retrieved context above. Do not invent project facts.
3. Review conversation history and mentor memory. Build on prior advice; do not repeat it.
4. For off-topic questions, set answer to the refusal message and confidence to 100.
5. Return ONLY valid JSON:
{
  "answer": "markdown string with actionable guidance",
  "confidence": number (0-100),
  "recommendations": ["string"],
  "followUpActions": ["string"],
  "relatedTasks": ["string"],
  "memoryUpdates": {
    "currentBlockers": ["string"],
    "completedTasks": ["string"],
    "recentRecommendations": ["string"],
    "currentImplementation": "string",
    "currentDebuggingSession": "string",
    "currentFeature": "string",
    "currentApis": ["string"],
    "currentDeploymentIssue": "string"
  }
}

Current user request:
\${userInput}`,

      generateTaskPlan: `Input data:
\${projectContext}

Generate task splitting details in JSON format:
{
  "epics": [
    {
      "epic": "string",
      "featureName": "string",
      "estimatedHours": number,
      "taskIds": ["string"]
    }
  ],
  "projectTasks": {
    "coreFeatures": ["string"],
    "technicalTasks": ["string"],
    "deploymentTasks": ["string"]
  },
  "assignments": [
    {
      "member": "string",
      "skills": ["string"],
      "assignedTasks": [
        {
          "id": "string",
          "task": "string",
          "taskName": "string",
          "featureName": "string",
          "epic": "string",
          "category": "Frontend" | "Backend" | "Database" | "AI" | "API" | "Testing" | "Deployment" | "Documentation",
          "priority": "High" | "Medium" | "Low",
          "difficulty": "Easy" | "Medium" | "Hard",
          "status": "Not Started" | "In Progress" | "Completed",
          "marketplaceStatus": "Locked" | "Available",
          "estimatedHours": number,
          "dependencies": ["string"],
          "deliverables": ["string"],
          "suggestedSkills": ["string"],
          "suggestedTechnologies": ["string"],
          "acceptanceCriteria": ["string"],
          "compatibilityScore": number,
          "confidence": number (0-100),
          "reasoning": "string"
        }
      ],
      "reason": "string"
    }
  ],
  "workloadDistribution": [
    {
      "member": "string",
      "percentage": number
    }
  ],
  "executionOrder": ["string"],
  "criticalPath": ["string"],
  "dependencies": ["string"],
  "dependencyGraph": {
    "nodes": [{"id": "string", "label": "string", "featureName": "string", "category": "string", "owner": "string", "status": "string"}],
    "edges": [{"from": "string", "to": "string"}]
  },
  "milestones": [{"name": "string", "tasks": ["string"], "estimatedHours": number}],
  "deliverables": ["string"],
  "criticalTasks": ["string"],
  "recommendedFocus": ["string"],
  "warnings": ["string"]
}`,

      getMarketplaceRecommendation: `Request:
\${userInput}
Context:
\${projectContext}

JSON Schema:
{
  "recommendation": "Approve" | "Reject",
  "confidenceScore": number (0-100),
  "reason": "string"
}`,

      analyzeTechStack: `Proposal:
\${userInput}
Context:
\${projectContext}

JSON Schema:
{
  "readinessScore": number (0-100),
  "consensusScore": number (0-100),
  "strengths": ["string"],
  "risks": ["string"],
  "recommendedChanges": ["string"],
  "recommendedStack": {
    "frontend": ["string"],
    "backend": ["string"],
    "database": ["string"],
    "ai": ["string"],
    "deployment": ["string"]
  },
  "reasoning": "string",
  "finalRecommendation": "string",
  "advantages": ["string"],
  "disadvantages": ["string"],
  "ecosystem": "string",
  "learningCurve": "string",
  "community": "string",
  "maintenance": "string",
  "performance": "string",
  "aiCompatibility": "string",
  "futureScalability": "string",
  "alternatives": [
    {
      "tech": "string",
      "alternative": "string",
      "tradeOff": "string"
    }
  ],
  "negotiationSuggestions": ["string"],
  "confidence": number (0-100)
}`,

      analyzeHackathonCommandCenter: `Context:
\${projectContext}

Ensure you output ONLY JSON matching this schema:
{
  "overallStatus": "On Track" | "Needs Attention" | "Critical",
  "riskLevel": "Low" | "Medium" | "High",
  "completionPrediction": "string",
  "predictions": ["string"],
  "focusAreas": ["string"],
  "currentFocus": ["string"],
  "tasksToPostpone": ["string"],
  "scopeReductionSuggestions": ["string"],
  "reasoning": "string",
  "judgePreparationTips": ["string"],
  "executionStrategy": ["string"],
  "winningProbability": number (0-100),
  "riskScore": number (0-100),
  "completionProbability": number (0-100),
  "dynamicScopeCutSuggestions": ["string"],
  "nextBestTask": {
    "task": "string",
    "assignedTo": "string",
    "reason": "string"
  },
  "productivityTrend": "Rising" | "Stable" | "Declining",
  "burndownVelocity": number,
  "readinessScores": {
    "judge": number,
    "deployment": number,
    "demo": number,
    "testing": number
  },
  "alerts": [
    {
      "title": "string",
      "severity": "Critical" | "Warning" | "Recommendation" | "Information" | "Success" | "Achievement" | "Prediction",
      "message": "string",
      "category": "Task" | "Git" | "Timeline" | "Collaboration",
      "reason": "string",
      "evidence": "string",
      "affectedFeature": "string",
      "affectedTeamMember": "string",
      "confidenceScore": number,
      "suggestedAction": "string",
      "expectedImpact": "string",
      "timestamp": "string"
    }
  ],
  "timeline": [
    {
      "time": "string",
      "event": "string",
      "type": "Success" | "Milestone" | "Info" | "Alert" | "Decision",
      "healthImpact": "string",
      "riskImpact": "string"
    }
  ],
  "executiveReport": {
    "executiveSummary": "string",
    "projectOverview": "string",
    "featureAnalysis": "string",
    "taskAnalysis": "string",
    "teamAnalysis": "string",
    "gitHubIntelligence": "string",
    "marketplaceActivity": "string",
    "collaborationAnalysis": "string",
    "riskAssessment": "string",
    "productivityAnalysis": "string",
    "timelineAnalysis": "string",
    "deploymentReadiness": "string",
    "testingReadiness": "string",
    "judgeReadiness": "string",
    "overallProjectHealth": "string",
    "completionForecast": "string",
    "recommendations": ["string"]
  }
}`,

      analyzeGitHubRepository: `Context:
\${projectContext}

JSON Schema:
{
  "repositoryHealth": "Excellent" | "Healthy" | "Needs Attention" | "Critical",
  "developmentStatus": "Active" | "Slow Progress" | "Stalled" | "Ready For Demo",
  "documentationStatus": "string",
  "testingStatus": "string",
  "deploymentStatus": "string",
  "inactiveMembers": ["string"],
  "missingComponents": ["string"],
  "repositoryWarnings": ["string"],
  "recommendations": ["string"],
  "reasoning": "string",
  "commits": [{"sha": "string", "message": "string", "author": "string", "date": "string"}],
  "contributors": [{"name": "string", "commits": number, "impactScore": number}],
  "issues": [{"title": "string", "status": "string", "risk": "string"}],
  "branches": [{"name": "string", "status": "string"}],
  "pullRequests": [{"title": "string", "status": "string", "risk": "string"}],
  "repositoryHealthScore": number,
  "codeQuality": "Low" | "Medium" | "High",
  "velocity": "Slow" | "Steady" | "Fast",
  "developerProductivity": [
    {
      "developer": "string",
      "commitsCount": number,
      "filesChanged": number,
      "impactScore": number
    }
  ],
  "contributionHeatmap": [
    {
      "date": "string (YYYY-MM-DD)",
      "commits": number
    }
  ],
  "codeComplexity": "Low" | "Medium" | "High",
  "mergeRisk": "Low" | "Medium" | "High",
  "aiSuggestions": ["string"]
}`,

      verifyTaskWithAI: `Context:
\${projectContext}

JSON Schema:
{
  "verificationStatus": "Verified" | "Partially Verified" | "Cannot Verify" | "Needs Manual Review",
  "confidence": number (0-100),
  "matchedFiles": ["string"],
  "matchedCommits": ["string"],
  "reasoning": "string",
  "missingEvidence": ["string"],
  "recommendation": "string"
}`,

      winningProbability: `Context:
\${projectContext}

JSON Schema:
{
  "winningProbability": number (0-100),
  "keyDifferentiators": ["string"],
  "risksToResolve": ["string"],
  "suggestions": ["string"]
}`,

      extractSkills: `Resume text:
\${userInput}

JSON Schema:
{
  "skills": ["string"]
}`,

      extractMentorMemory: `Conversation exchange:
\${userInput}

Return ONLY valid JSON matching:
{
  "architectureDecisions": ["string"],
  "techStackDecisions": ["string"],
  "projectMilestones": ["string"],
  "previousAiAdvice": ["string"],
  "currentBlockers": ["string"],
  "completedTasks": ["string"],
  "recentRecommendations": ["string"],
  "currentSprint": "string",
  "hackathonStage": "string",
  "githubStatus": "string"
}`
    };
  }

  getVersion(moduleName) {
    return this.versions[moduleName] || '1.0.0';
  }

  getPromptMetadata(moduleName) {
    return this.metadata[moduleName] || {
      id: `hackbuddy.${moduleName}`,
      version: this.getVersion(moduleName),
      module: moduleName,
      createdAt: '2026-06-27T00:00:00.000Z',
      updatedAt: '2026-06-27T00:00:00.000Z',
      expectedSchema: moduleName,
      qualityScore: 0.8
    };
  }

  getSystemPrompt(moduleName) {
    return this.systemPrompts[moduleName] || 'You are an AI assistant.';
  }

  getDeveloperPrompt(moduleName, variables = {}) {
    let prompt = this.developerPrompts[moduleName] || '';
    Object.keys(variables).forEach(key => {
      prompt = prompt.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), variables[key]);
    });
    return prompt;
  }
}

module.exports = new PromptVersionManager();
