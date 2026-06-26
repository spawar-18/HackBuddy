const { OpenAI } = require('openai');

/**
 * DeepSeekProvider
 * Fallback 1 Provider (Featherless) running model DeepSeek-V4-Pro
 */
class DeepSeekProvider {
  constructor() {
    this.name = 'DeepSeekProvider';
    this.modelName = process.env.DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V4-Flash';
    this.apiKey = process.env.DEEPSEEK_API || process.env.GLM_API;
    this.baseURL = process.env.GLM_BASE_URL || 'https://api.featherless.ai/v1';
    this.client = null;

    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL
      });
    }
  }

  getName() {
    return this.name;
  }

  getModelName() {
    return this.modelName;
  }

  isStreamingSupported() {
    return true;
  }

  /**
   * Executes AI call.
   * @param {object} payload - Prompt builder payload
   * @returns {Promise<string>}
   */
  async execute(payload) {
    if (!this.client) {
      throw new Error('DeepSeekProvider is not configured. Missing DEEPSEEK_API key.');
    }

    const messages = [];
    if (payload.systemInstruction) {
      messages.push({ role: 'system', content: payload.systemInstruction });
    }

    if (Array.isArray(payload.contents)) {
      payload.contents.forEach(item => {
        messages.push({
          role: item.role === 'model' ? 'assistant' : 'user',
          content: item.parts?.[0]?.text || item.text || JSON.stringify(item)
        });
      });
    } else {
      messages.push({ role: 'user', content: payload.contents });
    }

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages,
      temperature: payload.temperature !== undefined ? payload.temperature : (payload.isJson ? 0.0 : 0.2),
      max_tokens: 2000
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeekProvider returned empty content.');
    }

    return content;
  }
}

module.exports = DeepSeekProvider;
