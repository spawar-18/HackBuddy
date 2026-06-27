const AIProviderManager = require('./AIProviderManager');

/**
 * ConversationSummarizer
 * Focuses on summarizing user-mentor conversations to preserve token efficiency.
 */
class ConversationSummarizer {
  /**
   * Summarizes a list of messages.
   * @param {Array} messages - Chat messages list
   * @returns {Promise<string>}
   */
  async summarize(messages) {
    if (!messages || messages.length === 0) return '';

    const historyText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.message || m.content || ''}`)
      .join('\n');

    try {
      const summaryPrompt = `Summarize this recent hackathon mentor conversation in 2 sentences. Highlight the main topic and decisions:
      
Conversation:
${historyText}`;

      const payload = {
        contents: summaryPrompt,
        systemInstruction: 'Provide a concise 2-sentence summary of the conversation.',
        isJson: false,
        promptVersion: '1.0.0',
        endpointName: 'memory_summarization'
      };

      const result = await AIProviderManager.executeWithRouting(payload, {
        route: ['GeminiProvider', 'DeepSeekProvider', 'GLMProvider'],
        timeoutMs: 15000,
        maxRetries: 1
      });

      return result && result.text ? result.text.trim() : '';
    } catch (err) {
      console.warn('[ConversationSummarizer] Failed to summarize chat history:', err.message);
      return '';
    }
  }
}

module.exports = new ConversationSummarizer();
