const mockFallbacks = require('./mockFallbacks');

/**
 * FallbackManager
 * Orchestrates graceful mock fallbacks when all AI providers fail,
 * preserving schema consistency so the frontend never crashes.
 */
class FallbackManager {
  /**
   * Retrieves mock fallback response for a given module and input.
   * @param {string} moduleName 
   * @param {any} userInput 
   * @param {object} [contextDetails] 
   * @returns {object|string}
   */
  getFallbackResponse(moduleName, userInput, contextDetails = {}) {
    console.warn(`[FallbackManager] Activating mock fallback for module: ${moduleName}`);
    
    switch (moduleName) {
      case 'analyzeTeam':
        return mockFallbacks.generateMockAnalysis(userInput);
      
      case 'analyzeProject':
        return mockFallbacks.generateMockProjectReview(userInput);
      
      case 'chatWithMentor':
        return mockFallbacks.generateMockChatResponse(userInput, contextDetails.projectContext || '');
      
      case 'generateTaskPlan':
        // Members list could be passed in context details
        return mockFallbacks.generateMockTaskPlan(userInput, contextDetails.members || []);
      
      case 'getMarketplaceRecommendation':
        return mockFallbacks.generateMockMarketplaceRecommendation(userInput);
      
      case 'analyzeTechStack':
        const proposal = userInput?.proposal || userInput || {};
        const votes = userInput?.votes || [];
        const members = userInput?.members || [];
        return mockFallbacks.generateMockTechStackAnalysis(proposal, votes, members);
      
      case 'analyzeHackathonCommandCenter':
        return mockFallbacks.generateMockCommandCenterReport(userInput);
      
      case 'analyzeGitHubRepository':
        return mockFallbacks.generateFallbackRepoAnalysis(userInput);

      case 'verifyTaskWithAI':
        return this.generateMockVerification(userInput);

      default:
        return {
          success: false,
          message: 'Graceful fallback: module not explicitly mocked.'
        };
    }
  }

  /**
   * Generates a basic mock verification object for task completions.
   */
  generateMockVerification(context) {
    const taskDetails = context?.taskDetails || {};
    return {
      verificationStatus: 'Needs Manual Review',
      confidence: 45,
      matchedFiles: [],
      matchedCommits: [],
      reasoning: `Provider execution failed for task "${taskDetails.taskName || 'N/A'}". Switched to safety review fallback.`,
      missingEvidence: ['Source code verification timed out. Please review the commit tree manually.'],
      recommendation: 'Check the commits directly in the GitHub tab to verify code addition.'
    };
  }
}

module.exports = new FallbackManager();
