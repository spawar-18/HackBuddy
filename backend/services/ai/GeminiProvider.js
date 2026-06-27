const { GoogleGenAI } = require('@google/genai');

/**
 * GeminiProvider
 * Fallback 2 Provider using the official Google GenAI SDK running model gemini-2.5-flash
 */
class GeminiProvider {
  constructor() {
    this.name = 'GeminiProvider';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API;
    this.client = null;

    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
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
      throw new Error('GeminiProvider is not configured. Missing GEMINI_API key.');
    }

    const config = {
      temperature: payload.temperature !== undefined ? payload.temperature : (payload.isJson ? 0.0 : 0.2),
    };

    if (payload.systemInstruction) {
      config.systemInstruction = payload.systemInstruction;
    }

    if (payload.isJson) {
      config.responseMimeType = 'application/json';
    }

    // Format contents for Google GenAI SDK
    let sdkContents = payload.contents;
    if (typeof sdkContents === 'string') {
      sdkContents = sdkContents;
    } else if (Array.isArray(sdkContents)) {
      sdkContents = sdkContents.map(item => ({
        role: item.role === 'assistant' ? 'model' : (item.role || 'user'),
        parts: Array.isArray(item.parts) ? item.parts : [{ text: item.message || item.text || JSON.stringify(item) }]
      }));
    }

    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: sdkContents,
      config
    });

    const content = response.text;
    if (!content) {
      throw new Error('GeminiProvider returned empty content.');
    }

    return content;
  }
}

module.exports = GeminiProvider;
