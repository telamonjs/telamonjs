'use client'

import { useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import { Alert } from '../../ui/alert'
import { Button } from '../../ui/button'
import { logger } from '../../utils/logger'

export interface QueryErrorStateProps {
  /**
   * What failed: an `Error`, a string, or any object carrying a string
   * `message` (API client errors). Its message becomes the description unless
   * `description` is given; anything without a usable message shows the title only.
   */
  error?: unknown
  /** Headline. Default: localized "Failed to load data". */
  title?: I18nText
  /** Replaces the message extracted from `error` (e.g. a friendlier text). */
  description?: I18nText
  /**
   * Shows the retry button. Called with no arguments, so `onRetry={refetch}` is
   * safe; when it returns a promise the button stays pending until it settles.
   */
  onRetry?: () => unknown
  /** Caller-driven pending state, e.g. `retrying={query.isFetching}`. */
  retrying?: boolean
  /** Retry button label. Default: localized "Try again". */
  retryLabel?: I18nText
  className?: string
}

/** The message of an Error, a string, or an object with a string `message`. */
function messageOf(error: unknown): string | undefined {
  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: unknown }).message
        : undefined
  return typeof message === 'string' && message.trim() ? message : undefined
}

/**
 * QueryErrorState - error state of a query, with an optional "Try again".
 *
 * The error UI for screens that run their own `useQuery` (and the one the CRUD
 * dialogs use): a destructive alert with a localized title, the error's message
 * and a retry button that stays pending while `onRetry` runs.
 *
 * @example
 * ```tsx
 * const { data, error, isError, refetch } = useQuery(...)
 * if (isError) return <QueryErrorState error={error} onRetry={refetch} />
 * ```
 *
 * @example
 * Context-specific title, several queries retried together:
 * ```tsx
 * <QueryErrorState
 *   title="Could not load the grading sheet"
 *   error={sheet.error ?? files.error}
 *   onRetry={() => Promise.all([sheet.refetch(), files.refetch()])}
 * />
 * ```
 */
export function QueryErrorState({
  error,
  title,
  description,
  onRetry,
  retrying,
  retryLabel,
  className,
}: QueryErrorStateProps) {
  const t = useTelamonjsT()
  const text = useText()
  const [running, setRunning] = useState(false)
  const pending = Boolean(retrying) || running
  const detail = text(description) ?? messageOf(error)

  const retry = async () => {
    if (!onRetry || pending) return
    setRunning(true)
    try {
      await onRetry()
    } catch (err) {
      // The error state stays on screen; the next render shows the new error.
      logger.error('[QueryErrorState] onRetry failed', {
        error: err instanceof Error ? err : String(err),
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Alert
      variant='destructive'
      className={className}
      data-testid='query-error-state'
    >
      <AlertCircle className='h-4 w-4' aria-hidden='true' />
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <p className='text-sm font-medium leading-none'>
            {text(title) ?? t('dialog.loadDataError')}
          </p>
          {detail && (
            <p
              className='text-sm break-words opacity-90'
              data-testid='query-error-description'
            >
              {detail}
            </p>
          )}
        </div>
        {onRetry && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => void retry()}
            loading={pending}
            className='shrink-0 gap-1.5 bg-card text-foreground hover:bg-muted/50'
            data-testid='query-error-retry'
          >
            {/* pending: Button renders its own spinner in place of the icon */}
            {!pending && <RefreshCw className='h-4 w-4' aria-hidden='true' />}
            {text(retryLabel) ?? t('common.retry')}
          </Button>
        )}
      </div>
    </Alert>
  )
}
