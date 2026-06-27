const https = require('https');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const SSL_ERROR_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
]);

function fetchWithNodeHttps(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(Buffer.concat(chunks).toString('utf8')),
          json: () => Promise.resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(options.timeoutMs || 15000, () => {
      req.destroy(new Error(`Request timed out: ${url}`));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function fetchWithPowerShell(url, options = {}) {
  if (process.platform !== 'win32') {
    throw new Error('PowerShell HTTPS fallback is only available on Windows');
  }

  const method = (options.method || 'GET').toUpperCase();
  const escapedUrl = url.replace(/'/g, "''");
  const headerLines = Object.entries(options.headers || {})
    .map(([key, value]) => `$headers['${key.replace(/'/g, "''")}']='${String(value).replace(/'/g, "''")}'`)
    .join('; ');

  const script = [
    "$ErrorActionPreference = 'Stop'",
    headerLines ? `$headers = @{}; ${headerLines}` : '$headers = @{}',
    method === 'POST'
      ? `$body = @'${options.body || ''}'@`
      : null,
    method === 'POST'
      ? `$response = Invoke-WebRequest -Uri '${escapedUrl}' -Method POST -Headers $headers -Body $body -UseBasicParsing`
      : `$response = Invoke-WebRequest -Uri '${escapedUrl}' -Method ${method} -Headers $headers -UseBasicParsing`,
    '$response.StatusCode',
    '$response.Content',
  ]
    .filter(Boolean)
    .join('; ');

  const { stdout } = await execFileAsync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { maxBuffer: 10 * 1024 * 1024, timeout: options.timeoutMs || 15000 }
  );

  const lines = stdout.replace(/\r/g, '').split('\n');
  const status = Number(lines.shift());
  const body = lines.join('\n');

  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  };
}

async function secureFetch(url, options = {}) {
  try {
    return await fetchWithNodeHttps(url, options);
  } catch (error) {
    const code = error.code || error.cause?.code;
    if (SSL_ERROR_CODES.has(code) && process.platform === 'win32') {
      return fetchWithPowerShell(url, options);
    }
    throw error;
  }
}

module.exports = { secureFetch };
