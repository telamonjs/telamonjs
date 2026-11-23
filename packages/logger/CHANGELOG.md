# Changelog

## 1.0.2

### Patch Changes

- a599b51: Honor `LoggerConfig.format` and drop the `chalk` dependency.

  - `format: 'json'` now writes one JSON object per line (`timestamp`, `level`, `message`, `context`), and `createServerLogger()` emits JSON lines as documented. `format: 'pretty'` returns a `PrettyLogger`; `'simple'` (the default) keeps the text output.
  - `PrettyLogger` colors its output with plain ANSI codes instead of `chalk` (ESM-only), so importing the package no longer loads `chalk` — consumers no longer need to mock it in Jest. It now honors `colorize`, defaulting to colors on a TTY without `NO_COLOR`.
  - `engines.node` is now `>=22.12`, where `require()` of the ESM build is stable.

## 1.0.1

First public release of `@telamonjs/logger`. Release notes: [CHANGELOG.md](https://github.com/telamonjs/telamonjs/blob/main/CHANGELOG.md).
