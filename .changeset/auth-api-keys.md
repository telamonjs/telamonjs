---
'@telamonjs/auth': minor
---

Service-to-service auth with API keys. `@telamonjs/auth/nest` adds `createApiKeyGuard({ verify, header?, bearer?, createException? })` (the verifier's principal goes to `request.servicePrincipal`, `request.user` is untouched, failures are a generic 401, nothing is logged), `staticApiKey(expected, name?)` (constant-time check of one shared secret, closed while unset), and `@AllowServiceToken()` with a new `apiKey` option on `createJwtAuthGuard`, so a marked route accepts a session or a key. The core adds `generateApiKey(prefix?)` and `hashApiKey(key)` (hex sha256, Web Crypto).
