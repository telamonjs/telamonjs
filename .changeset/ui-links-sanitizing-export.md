---
"@telamonjs/ui": patch
---

- `SignInForm` ignores a `?callbackUrl` whose path normalizes to `//…` and falls back to the `callbackUrl` prop.
- `sanitizeSvg` and `sanitizeRichText` return `''` when no DOM is available. `CardLink` inserts a string icon right after hydration.
- The `file` field's download button opens only http(s), `blob:` and relative URLs.
- CSV export writes a leading `'` before text cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return. Numbers and numeric strings such as `-12.50` are unchanged.
- `FileUpload` keeps the current file when its replacement is rejected for size or type.
- The queue dashboard reconnects at once when the server ends a stream with `event: reconnect`.
