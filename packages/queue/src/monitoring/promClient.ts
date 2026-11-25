import * as PromClient from 'prom-client'

/**
 * prom-client for the metrics classes. A static import on purpose: an earlier
 * lazy `createRequire` keyed on the module URL broke consumers whose test
 * runner transpiles this package to CommonJS (Jest/ts-jest cannot parse the
 * module-URL meta property). See `no-import-meta.test.ts`.
 */
export function promClient(): typeof PromClient {
  return PromClient
}
