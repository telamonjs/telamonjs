import { createRequire } from 'node:module'
import type * as PromClient from 'prom-client'

let cached: typeof PromClient | undefined

/**
 * prom-client, loaded on first use instead of at import time, so the root
 * entry and `./monitoring` (which re-export the metrics classes) stay free of
 * it until someone actually constructs a metrics collector. prom-client is
 * CommonJS, so `require` returns the same instance a consumer's own
 * `import { Registry } from 'prom-client'` gets: a passed-in `Registry` keeps
 * working.
 */
export function promClient(): typeof PromClient {
  cached ??= createRequire(import.meta.url)('prom-client') as typeof PromClient
  return cached
}
