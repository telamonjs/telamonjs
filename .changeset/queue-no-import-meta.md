---
'@telamonjs/queue': patch
---

Fix: 1.4.0 loaded `prom-client` through a module-URL `createRequire`, and any test runner that transpiles the package to CommonJS (Jest + ts-jest in Nest apps) failed to load the root entry with "Cannot use 'import.meta' outside a module". `prom-client` is a static import again, so the root and `./monitoring` load it on import as in 1.3. `@telamonjs/queue/metrics` stays.
