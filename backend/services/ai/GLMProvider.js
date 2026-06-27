const { OpenAI } = require('openai');

/**
 * GLMProvider
 * Primary AI Provider (Featherless) running model GLM-5.2
 */
class GLMProvider {
  constructor() {
    this.name = 'GLMProvider';
    this.modelName = process.env.GLM_MODEL || 'zai-org/GLM-4.7-Flash';
    this.apiKey = process.env.GLM_API;
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
      throw new Error('GLMProvider is not configured. Missing GLM_API key.');
    }

    const messages = [];
    if (payload.systemInstruction) {
      messages.push({ role: 'system', content: payload.systemInstruction });
    }

    if (Array.isArray(payload.contents)) {
      // Chat historical array payload format
      payload.contents.forEach(item => {
        messages.push({
          role: item.role === 'model' ? 'assistant' : 'user',
          content: item.parts?.[0]?.text || item.text || JSON.stringify(item)
        });
      });
    } else {
      messages.push({ role: 'user', content: payload.contents });
    }

    const request = {
      model: this.modelName,
      messages,
      temperature: payload.temperature !== undefined ? payload.temperature : (payload.isJson ? 0.0 : 0.2),
      max_tokens: 4000
    };

    if (payload.isJson) {
      request.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat.completions.create(request);

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('GLMProvider returned empty content.');
    }

    return content;
  }
}

module.exports = GLMProvider;
