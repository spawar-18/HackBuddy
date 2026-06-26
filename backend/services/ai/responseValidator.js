/**
 * ResponseValidator
 * Handles cleaning, tag stripping, JSON repairing, and structural validation
 * of responses returned by the Gemini API.
 */

/**
 * Strip think tags from reasoning models (e.g. Qwen, deepseek, or other LLMs).
 * @param {string} text - Raw AI response text
 * @returns {string} Text with think blocks removed
 */
const stripThinkTags = (text) => {
  if (!text) return '';
  // Remove all <think>...</think> blocks (including multiline)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Also handle unclosed <think> tags (model cut off before closing)
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '').trim();
  return cleaned;
};

/**
 * Attempt to repair truncated JSON by balancing braces and brackets.
 * Useful when max_tokens cuts the response mid-JSON.
 * @param {string} jsonStr - Potentially truncated JSON string
 * @returns {string} Repaired JSON string
 */
const repairTruncatedJson = (jsonStr) => {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  // If we're inside a string, close it
  let repaired = jsonStr;
  if (inString) repaired += '"';

  // Close any unclosed brackets/braces
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }

  return repaired;
};

/**
 * Cleans the response, finds the JSON block, repairs if necessary, parses, and returns the object.
 * @param {string} responseText - Text returned by the model
 * @param {Array<string>} [requiredKeys] - Keys that must be present
 * @param {object} [defaultValues] - Defaults for missing keys
 * @returns {object} Parsed JSON analysis
 */
const validateAndParseJson = (responseText, requiredKeys = [], defaultValues = {}) => {
  const stripped = stripThinkTags(responseText);
  
  // Find first '{' and last '}'
  const firstBrace = stripped.indexOf('{');
  if (firstBrace === -1) {
    console.error('Failed to parse AI response: No JSON object found. Response:', responseText.substring(0, 500));
    throw new Error('Invalid AI JSON response: No JSON object found in response');
  }
  
  let cleanText = stripped.substring(firstBrace);
  const lastBrace = cleanText.lastIndexOf('}');
  if (lastBrace !== -1) {
    cleanText = cleanText.substring(0, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText.trim());
  } catch (parseErr) {
    try {
      console.log('Failed to parse JSON directly. Trying to repair truncated JSON...');
      const repaired = repairTruncatedJson(cleanText.trim());
      parsed = JSON.parse(repaired);
    } catch (repairErr) {
      console.error('Failed to parse AI response as JSON even after repair attempt. Raw response:', responseText);
      throw new Error('Invalid AI JSON response: The response could not be parsed as JSON');
    }
  }

  // Ensure required keys exist and fallback to defaultValues if missing
  requiredKeys.forEach(key => {
    if (!(key in parsed)) {
      console.warn(`Warning: Missing required field: ${key}. Supplying default.`);
      parsed[key] = defaultValues[key] !== undefined ? defaultValues[key] : null;
    }
  });

  return parsed;
};

module.exports = {
  stripThinkTags,
  repairTruncatedJson,
  validateAndParseJson
};
