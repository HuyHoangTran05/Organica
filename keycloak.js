const Keycloak = require('keycloak-connect');

// Initializes and returns a Keycloak instance using a shared MemoryStore.
// Pass the express-session memory store so Keycloak can attach user sessions.
module.exports = function initKeycloak(memoryStore) {
  const cfg = {
    realm: process.env.KEYCLOAK_REALM,
    'auth-server-url': process.env.KEYCLOAK_BASE_URL,
    'ssl-required': 'external',
    resource: process.env.KEYCLOAK_CLIENT_ID,
    'public-client': false,
    'confidential-port': 0,
    credentials: { secret: process.env.KEYCLOAK_CLIENT_SECRET }
  };
  return new Keycloak({ store: memoryStore }, cfg);
};
