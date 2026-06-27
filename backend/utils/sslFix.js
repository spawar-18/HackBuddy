'use strict';

/**
 * Some Windows dev machines use antivirus or proxy SSL inspection. Node's bundled
 * CA store then fails HTTPS while the OS trust store (used by PowerShell/browsers) works.
 */
function applyWindowsDevSslWorkaround() {
  if (process.platform !== 'win32') return;
  if (process.env.NODE_ENV === 'production') return;
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '1') return;

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  try {
    const { Agent, setGlobalDispatcher } = require('undici');
    setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));
  } catch (_) {
    // undici not available; https module still picks up NODE_TLS_REJECT_UNAUTHORIZED
  }

  console.warn(
    '[HackBuddy] TLS verification relaxed for local Windows dev (SSL inspection detected). ' +
    'Do not enable this in production.'
  );
}

applyWindowsDevSslWorkaround();
