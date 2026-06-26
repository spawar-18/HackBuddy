const PromptVersionManager = require('./promptVersionManager');

/**
 * PromptManager
 * Constructs the final prompt objects with system instructions, user prompts, and configurations.
 */
class PromptManager {
  /**
   * Builds the prompt payload for a given module and input.
   * @param {string} moduleName - Module name
   * @param {object} params - Input params
   * @param {string} params.projectContext - Compiled project context
   * @param {string} params.userInput - User input text / object
   * @param {Array} [params.history] - Chat history
   * @returns {object} Prompt payload
   */
  buildPrompt(moduleName, { projectContext = '', userInput = '', history = [] }) {
    const systemInstruction = PromptVersionManager.getSystemPrompt(moduleName);
    const version = PromptVersionManager.getVersion(moduleName);

    let formattedUserInput = '';
    if (userInput && typeof userInput === 'object') {
      formattedUserInput = JSON.stringify(userInput, null, 2);
    } else {
      formattedUserInput = userInput;
    }

    const developerPrompt = PromptVersionManager.getDeveloperPrompt(moduleName, {
      projectContext: projectContext || 'No context available.',
      teamContext: projectContext || 'No context available.',
      userInput: formattedUserInput,
      history: '' // history is handled natively below
    });

    const isJson = moduleName !== 'chatWithMentor';
    
    let finalContents = developerPrompt;

    if (moduleName === 'chatWithMentor') {
      const messages = [];
      // Initial context
      messages.push({ role: 'user', content: developerPrompt });
      // We push a mock response from assistant to acknowledge context
      messages.push({ role: 'assistant', content: 'Understood. I will use this context and behave as the Senior Mentor. How can I help?' });
      
      if (Array.isArray(history) && history.length > 0) {
        history.forEach(h => {
          messages.push({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.message || h.content || ''
          });
        });
      }
      
      // Finally, push the current question
      messages.push({ role: 'user', content: formattedUserInput });
      finalContents = messages;
    }

    return {
      contents: finalContents,
      systemInstruction,
      isJson,
      schemaName: moduleName,
      promptVersion: version,
      endpointName: moduleName
    };
  }
}

module.exports = new PromptManager();
