const { OAuth2Client } = require('google-auth-library');
const { secureFetch } = require('./secureFetch');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs';
const CERT_CACHE_MS = 60 * 60 * 1000;

let cachedCerts = null;
let cacheExpiresAt = 0;

async function fetchGoogleCerts() {
  const now = Date.now();
  if (cachedCerts && now < cacheExpiresAt) {
    return cachedCerts;
  }

  const response = await secureFetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google certificates (${response.status})`);
  }

  cachedCerts = await response.json();
  cacheExpiresAt = now + CERT_CACHE_MS;
  return cachedCerts;
}

async function verifyGoogleIdToken(idToken, audience) {
  const certs = await fetchGoogleCerts();
  return client.verifySignedJwtWithCertsAsync(idToken, certs, audience);
}

module.exports = { verifyGoogleIdToken };
