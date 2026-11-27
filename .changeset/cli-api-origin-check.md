---
'@telamonjs/cli': patch
---

Generated apps: the middleware refuses writes to `/api/*` whose `Origin` is another origin (403). The SameSite=Lax session cookie still rides a form or no-cors POST from a sibling subdomain or another localhost port. Requests without an `Origin` pass, and `/api/auth/*` keeps Auth.js's own check.
