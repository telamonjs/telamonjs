---
'@telamonjs/logger': minor
---

`BrowserLogger` can ship logs to your backend. Opt in with `createBrowserLogger({ transport: { endpoint: '/api/logs' } })` (or `send: batch => …`): entries go out in batches (`batchSize`, default 20, or every `flushIntervalMs`, default 5000), `WARN` and above by default (`level`), through `navigator.sendBeacon` when the tab is hidden or closed. Context keys that usually hold personal data (`userEmail`, `ip`, `userAgent`, tokens, passwords, cookies…) are dropped unless `includePii: true`. Failed deliveries are dropped, never thrown. New types `BrowserLoggerConfig`, `BrowserLogTransport`, `BrowserLogEntry`.

Without a transport, `BrowserLogger` no longer runs a 5-second timer that cleared `getBuffer()`: the buffer keeps the last 100 entries until `flush()`/`clearBuffer()`. A string `level` (`'DEBUG'`, …) is now honored instead of falling back to `INFO`.
