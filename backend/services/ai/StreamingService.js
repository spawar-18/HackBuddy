/**
 * StreamingService
 * Handles SSE (Server-Sent Events) or response chunk streaming for AI chat features.
 */
class StreamingService {
  /**
   * Streams content to an Express Response object.
   * @param {object} res - Express Response object
   * @param {AsyncGenerator<string>} streamGenerator - The stream generator from provider
   * @param {function} [onChunk] - Optional callback per chunk
   */
  async streamToResponse(res, streamGenerator, onChunk) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of streamGenerator) {
        if (chunk) {
          if (onChunk) onChunk(chunk);
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error('[StreamingService] Stream interrupted:', err.message);
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted: ' + err.message })}\n\n`);
      res.end();
    }
  }
}

module.exports = new StreamingService();
