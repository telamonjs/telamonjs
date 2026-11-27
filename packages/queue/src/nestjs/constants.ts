export const QUEUE_HTTP_DEPS = Symbol('QUEUE_HTTP_DEPS')
export const QUEUE_HTTP_GET_ACTOR = Symbol('QUEUE_HTTP_GET_ACTOR')
/** `QueueHttpModuleOptions.sseMaxAgeMs` default: 5 minutes. */
export const DEFAULT_SSE_MAX_AGE_MS = 300_000
/**
 * Unsent bytes an SSE response may queue in the heap (past the kernel socket
 * buffers) before the stream is dropped. A reading client stays near 0.
 * ponytail: fixed; make it an option if a dashboard over a slow link needs more.
 */
export const SSE_MAX_UNSENT_BYTES = 1024 * 1024

/**
 * Same key (and value shape: an array of clauses, OR between entries, an
 * inner array is AND) as `PERMISSIONS_KEY` in `@telamonjs/permissions/nest`
 * (packages/permissions/src/nest/permissions.decorator.ts), the source of
 * truth. Duplicated so this package doesn't depend on it; a test pins the two.
 */
export const PERMISSIONS_METADATA_KEY = 'permissions'
