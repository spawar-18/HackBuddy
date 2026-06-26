/**
 * ConversationSummarizer
 * Focuses on summarizing user-mentor conversations to preserve token efficiency.
 */
class ConversationSummarizer {
  /**
   * Summarizes a list of messages.
   * @param {Array} messages - Chat messages list
   * @param {function} executeFn - Function reference to execute AI call
   * @returns {Promise<string>}
   */
  async summarize(messages, executeFn) {
    if (!messages || messages.length === 0) return '';

    const historyText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.message}`)
      .join('\n');

    try {
      const summaryPrompt = `Summarize this recent hackathon mentor conversation in 2 sentences. Highlight the main topic and decisions:
      
Conversation:
${historyText}`;

      // Call executeAI through the provided executor function reference to avoid circular dependencies
      const rawSummary = await executeFn({
        module: 'chatWithMentor', // Uses the chatWithMentor prompt context but with a custom user prompt
        userInput: summaryPrompt
      });

      return typeof rawSummary === 'string' ? rawSummary.trim() : '';
    } catch (err) {
      console.warn('[ConversationSummarizer] Failed to summarize chat history:', err.message);
      return '';
    }
  }
}

module.exports = new ConversationSummarizer();
