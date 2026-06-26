/**
 * JSONRepairService
 * Cleans and repairs malformed or truncated JSON strings before parsing.
 */
class JSONRepairService {
  /**
   * Strip Qwen-style <think>...</think> reasoning blocks.
   * @param {string} text 
   * @returns {string}
   */
  stripThinkTags(text) {
    if (!text) return '';
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    cleaned = cleaned.replace(/<think>[\s\S]*/gi, '').trim();
    return cleaned;
  }

  /**
   * Remove markdown code block fences (e.g. ```json ... ```)
   * @param {string} text 
   * @returns {string}
   */
  stripMarkdownFences(text) {
    if (!text) return '';
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      const nextLineIdx = cleaned.indexOf('\n');
      if (nextLineIdx !== -1) {
        cleaned = cleaned.substring(nextLineIdx + 1);
      } else {
        cleaned = cleaned.substring(3);
      }
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }

  /**
   * Repair unbalanced braces and brackets for truncated responses.
   * @param {string} jsonStr 
   * @returns {string}
   */
  repairTruncatedJson(jsonStr) {
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const ch = jsonStr[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }

    let repaired = jsonStr;
    if (inString) repaired += '"';
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }

    return repaired;
  }

  /**
   * Cleans, repairs and parses JSON.
   * @param {string} text 
   * @returns {object} Parsed JSON object
   */
  repairAndParse(text) {
    if (!text) {
      throw new Error('Empty AI response text');
    }

    const withoutThink = this.stripThinkTags(text);
    const cleaned = this.stripMarkdownFences(withoutThink);

    // Locate the first '{' or '['
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    let isArray = false;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      isArray = false;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      isArray = true;
    }

    if (startIdx === -1) {
      throw new Error('No JSON structure found in AI response');
    }

    let jsonSubstring = cleaned.substring(startIdx);
    const targetEndChar = isArray ? ']' : '}';
    const lastTargetIdx = jsonSubstring.lastIndexOf(targetEndChar);
    
    if (lastTargetIdx !== -1) {
      jsonSubstring = jsonSubstring.substring(0, lastTargetIdx + 1);
    }

    // Try direct parse
    try {
      return JSON.parse(jsonSubstring);
    } catch (e) {
      // Try repair
      try {
        const repaired = this.repairTruncatedJson(jsonSubstring.trim());
        return JSON.parse(repaired);
      } catch (repairErr) {
        throw new Error(`Failed to parse repaired JSON: ${repairErr.message}. Original snippet: ${jsonSubstring.substring(0, 100)}`);
      }
    }
  }
}

module.exports = new JSONRepairService();
