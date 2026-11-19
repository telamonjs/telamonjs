/**
 * `meta` for every query and mutation the library runs. The library owns their
 * error UX (CRUD mutations toast, lists render an error state with retry, the
 * queue dashboard toasts a translated message), so an app-level global handler
 * — QueryCache/MutationCache `onError` on the client passed through
 * `AppProviders` `config.queryClient` — must skip them or the user gets the
 * error twice. `skipErrorToast` is the key the consumer apps already honor.
 * Internal — not exported from the barrel.
 */
export const LIB_QUERY_META = { skipErrorToast: true } as const
