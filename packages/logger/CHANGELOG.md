# Changelog

## 1.1.0

### Minor Changes

- ac040f3: `BrowserLogger` can ship logs to your backend. Opt in with `createBrowserLogger({ transport: { endpoint: '/api/logs' } })` (or `send: batch => …`): entries go out in batches (`batchSize`, default 20, or every `flushIntervalMs`, default 5000), `WARN` and above by default (`level`), through `navigator.sendBeacon` when the tab is hidden or closed. Context keys that usually hold personal data (`userEmail`, `ip`, `userAgent`, tokens, passwords, cookies…) are dropped unless `includePii: true`. Failed deliveries are dropped, never thrown. New types `BrowserLoggerConfig`, `BrowserLogTransport`, `BrowserLogEntry`.

  Without a transport, `BrowserLogger` no longer runs a 5-second timer that cleared `getBuffer()`: the buffer keeps the last 100 entries until `flush()`/`clearBuffer()`. A string `level` (`'DEBUG'`, …) is now honored instead of falling back to `INFO`.

### Patch Changes

- 2d019f6: `audit()` entries are no longer dropped by the level filter. They are compliance records
  (`AuditContext` carries `changes`, `reason`, `compliance: ['GDPR', 'LGPD']`), yet they were logged at
  INFO, so a production `LOG_LEVEL=warn` silently discarded the whole audit trail. They are now always
  written (still at INFO severity, tagged `level: 'audit'`); only a disabled logger (`enabled: false`,
  `createTestLogger()`) drops them. Documented in the README and on the logger docs page.
- 06e660f: Logging never throws on a hard-to-serialize context any more: a `BigInt` value (a Prisma `BigInt`
  id, say) is written as its decimal string instead of making `logger.info()` throw
  "Do not know how to serialize a BigInt", and `PrettyLogger` now cleans its context like the other
  adapters, so a circular value prints `[Circular]` instead of throwing and an `Error` keeps its
  message and stack instead of printing `{}`.

## 1.0.2

### Patch Changes

- a599b51: Honor `LoggerConfig.format` and drop the `chalk` dependency.

  - `format: 'json'` now writes one JSON object per line (`timestamp`, `level`, `message`, `context`), and `createServerLogger()` emits JSON lines as documented. `format: 'pretty'` returns a `PrettyLogger`; `'simple'` (the default) keeps the text output.
  - `PrettyLogger` colors its output with plain ANSI codes instead of `chalk` (ESM-only), so importing the package no longer loads `chalk` — consumers no longer need to mock it in Jest. It now honors `colorize`, defaulting to colors on a TTY without `NO_COLOR`.
  - `engines.node` is now `>=22.12`, where `require()` of the ESM build is stable.

## 1.0.1

First public release of `@telamonjs/logger`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
