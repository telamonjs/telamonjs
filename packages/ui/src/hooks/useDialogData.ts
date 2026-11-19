'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '../utils/logger'
import { useTelamonjsT } from '../i18n/use-t'

/**
 * Return type for useDialogData hook
 */
export interface UseDialogDataReturn<T> {
  /** The fetched data, or null if not loaded */
  data: T | null
  /** Whether data is currently being fetched */
  isLoading: boolean
  /** Error message if fetch failed, or null */
  error: string | null
  /** Function to manually refetch data */
  refetch: () => void
  /**
   * Background refetch: no loading flash, does not clear `data`, does not surface errors.
   * Use when the dialog content is already mounted and must not be unmounted
   * (e.g. a form with typed, not-yet-saved values).
   */
  refetchSilent: () => void
  /** Function to manually set data (useful for optimistic updates) */
  setData: (data: T | null) => void
  /** Function to clear error state */
  clearError: () => void
}

/**
 * Options for useDialogData hook
 */
export interface UseDialogDataOptions {
  /**
   * Delay before resetting state when dialog closes (ms)
   * @default 200
   */
  resetDelay?: number
  /**
   * Callback when data is successfully fetched
   */
  onSuccess?: () => void
  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void
}

/**
 * Hook for managing dialog data fetching state.
 *
 * Encapsulates the common pattern of:
 * - Fetching data when dialog opens (id + open === true)
 * - Managing loading, error, and data states
 * - Resetting state when dialog closes
 *
 * @example
 * ```tsx
 * function MyDialog({ id, open, onOpenChange }: Props) {
 *   const { data, isLoading, error, refetch } = useDialogData(
 *     id,
 *     fetchMyEntity,
 *     open
 *   )
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <ErrorAlert message={error} onRetry={refetch} />
 *   if (!data) return null
 *
 *   return <MyContent data={data} />
 * }
 * ```
 *
 * @param id - Entity ID to fetch (null/undefined skips fetch)
 * @param fetchAction - Async function to fetch data by ID
 * @param open - Whether the dialog is open
 * @param options - Optional configuration
 * @returns Object with data, loading, error states and control functions
 *
 * @category Hooks
 */
export function useDialogData<T>(
  id: string | null | undefined,
  fetchAction: (id: string) => Promise<T>,
  open: boolean,
  options: UseDialogDataOptions = {}
): UseDialogDataReturn<T> {
  const { resetDelay = 200, onSuccess, onError } = options
  const t = useTelamonjsT()

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use refs for callbacks to avoid circular dependencies in useCallback
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  // Keep refs updated
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  }, [onSuccess, onError])

  // Runs the fetch itself. Deliberately does NOT reset loading/data/error —
  // callers that need an immediate reset do it synchronously in a handler
  // (refetch below) or via the render-time comparison further down (the
  // open/id-driven auto-fetch), so this function has no setState call before
  // its first `await` and calling it from the effect below is not a
  // synchronous setState-in-effect.
  // `silent`: reloads without going through loading or clearing `data`. This is
  // what nested-data refresh needs — a loading flash unmounts the dialog form
  // and the user loses what they typed but had not yet saved.
  const runFetch = useCallback(
    async (fetchId: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true

      try {
        const result = await fetchAction(fetchId)
        setData(result)
        onSuccessRef.current?.()
      } catch (err) {
        // 404: the backend's message is raw (often English, "X with id 9 not
        // found") — show the translated text. Any client error exposing
        // `status`/`statusCode` (fetch wrappers, axios-like) qualifies.
        const e = err as { status?: unknown; statusCode?: unknown } | null
        const errorMessage =
          e?.status === 404 || e?.statusCode === 404
            ? t('dialog.notFound')
            : err instanceof Error
              ? err.message
              : t('dialog.loadDataError')
        logger.error('[useDialogData] Fetch error', {
          error: err instanceof Error ? err : String(err),
        })
        // silent: log only. Replacing the content with an error would unmount an
        // open form because of a refresh the user never even asked for.
        if (!silent) setError(errorMessage)
        onErrorRef.current?.(err instanceof Error ? err : new Error(errorMessage))
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [fetchAction, t]
  )

  // Reset loading/data/error the instant the (open, id) pair changes — in
  // render, by comparing against the previous pair — so callers see the
  // reset synchronously instead of waiting for the effect below to run.
  const fetchKey = open && id ? id : null
  const [lastFetchKey, setLastFetchKey] = useState<string | null>(null)
  if (fetchKey !== lastFetchKey) {
    setLastFetchKey(fetchKey)
    if (fetchKey) {
      setIsLoading(true)
      setData(null)
      setError(null)
    }
  }

  // Fetch data when dialog opens. The reset above is already synchronous;
  // deferring the fetch call itself to a microtask is what keeps this effect
  // free of any (even indirectly, eventually-async) setState call the
  // compiler can trace back to it.
  useEffect(() => {
    if (open && id) {
      queueMicrotask(() => {
        void runFetch(id)
      })
    }
  }, [open, id, runFetch])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Delay reset to avoid visual glitch during close animation
      const timer = setTimeout(() => {
        setData(null)
        setError(null)
        setIsLoading(false)
      }, resetDelay)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [open, resetDelay])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Zero-argument signatures: `refetch` stays pluggable into onClick/onRetry.
  // Called from a handler, not an effect, so the synchronous reset here is fine.
  const refetch = useCallback(() => {
    if (!id) return
    setIsLoading(true)
    setData(null)
    setError(null)
    void runFetch(id)
  }, [id, runFetch])

  const refetchSilent = useCallback(() => {
    if (!id) return
    void runFetch(id, { silent: true })
  }, [id, runFetch])

  return {
    data,
    isLoading,
    error,
    refetch,
    refetchSilent,
    setData,
    clearError,
  }
}
