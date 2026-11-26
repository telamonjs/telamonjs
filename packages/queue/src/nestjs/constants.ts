export const QUEUE_HTTP_DEPS = Symbol('QUEUE_HTTP_DEPS')
export const QUEUE_HTTP_GET_ACTOR = Symbol('QUEUE_HTTP_GET_ACTOR')
/** `QueueHttpModuleOptions.sseMaxAgeMs` default: 5 minutes. */
export const DEFAULT_SSE_MAX_AGE_MS = 300_000

/**
 * Same key (and value shape: an array of clauses, OR between entries, an
 * inner array is AND) as `PERMISSIONS_KEY` in `@telamonjs/permissions/nest`
 * (packages/permissions/src/nest/permissions.decorator.ts), the source of
 * truth. Duplicated so this package doesn't depend on it; a test pins the two.
 */
export const PERMISSIONS_METADATA_KEY = 'permissions'
