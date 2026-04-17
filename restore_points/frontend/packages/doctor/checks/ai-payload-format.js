import http from 'http';

export default {
  id: 'ai-payload-format',
  description: 'Sends a known-good JSON payload to /api/ai and inspects how the backend handles it.',

  async run({ projectRoot, baseUrl = 'http://localhost:4000' }) {
    const payload = {
      prompt: 'Doctor AI payload integrity test',
      meta: { source: 'enterprise-doctor', type: 'diagnostic' }
    };

    const body = JSON.stringify(payload);

    const result = await new Promise(resolve => {
      const req = http.request(
        `${baseUrl}/api/ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            let parsed = null;
            let parseError = null;

            try {
              parsed = JSON.parse(data);
            } catch (err) {
              parseError = err.message;
            }

            resolve({
              statusCode: res.statusCode,
              rawBody: data,
              parsed,
              parseError
            });
          });
        }
      );

      req.on('error', err => {
        resolve({
          statusCode: null,
          rawBody: null,
          parsed: null,
          parseError: err.message
        });
      });

      req.write(body);
      req.end();
    });

    const ok =
      result.statusCode &&
      result.statusCode >= 200 &&
      result.statusCode < 300 &&
      !result.parseError;

    return {
      ok,
      message: ok
        ? 'AI route accepts well-formed JSON and returns valid JSON.'
        : 'AI route or environment is mishandling JSON payloads.',
      details: {
        baseUrl,
        requestPayload: payload,
        response: result
      }
    };
  }
};