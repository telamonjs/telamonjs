'use client'

import { AlertCircle, Loader2 } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'
import { Alert, AlertDescription } from '../../ui/alert'
import { Button } from '../../ui/button'

export interface DialogErrorStateProps {
  /** Error message to display */
  error: string | null
  /** Optional retry callback */
  onRetry?: () => void
  /** Optional dismiss callback */
  onDismiss?: () => void
}

/**
 * DialogErrorState - Renders error state with optional retry/dismiss actions
 *
 * Provides consistent error UI across dialogs (view, edit, create).
 * Replaces duplicated error Alert rendering logic.
 *
 * @example
 * ```tsx
 * // Simple error display
 * {error && <DialogErrorState error={error} />}
 *
 * // With retry callback
 * <DialogErrorState
 *   error={error}
 *   onRetry={refetch}
 *   onDismiss={() => setError(null)}
 * />
 * ```
 */
export function DialogErrorState({
  error,
  onRetry,
  onDismiss,
}: DialogErrorStateProps) {
  const t = useTelamonjsT()
  if (!error) return null

  return (
    <div className='py-8'>
      <Alert variant='destructive'>
        <AlertCircle className='h-4 w-4' />
        <AlertDescription className='flex items-center justify-between gap-4'>
          <span>{error}</span>
          {(onRetry || onDismiss) && (
            <div className='flex gap-2'>
              {onRetry && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={onRetry}
                  className='bg-card hover:bg-muted/50'
                  data-testid='dialog-error-retry-button'
                >
                  {t('dialog.retryLabel')}
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={onDismiss}
                  className='bg-card hover:bg-muted/50'
                  data-testid='dialog-error-dismiss-button'
                >
                  {t('common.close')}
                </Button>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}

export interface DialogLoadingStateProps {
  /** Loading message */
  message?: string
}

/**
 * DialogLoadingState - Renders loading spinner with optional message.
 *
 * Consolidates the duplicated loading spinner rendering from EditDialog and ViewDialog.
 *
 * @example
 * ```tsx
 * {isLoading && <DialogLoadingState />}
 * {isLoading && <DialogLoadingState message="Buscando dados..." />}
 * ```
 */
export function DialogLoadingState({ message }: DialogLoadingStateProps) {
  const t = useTelamonjsT()
  return (
    <div className='flex flex-col items-center justify-center py-12 space-y-4'>
      <Loader2 className='h-8 w-8 animate-spin text-primary' />
      <p className='text-sm text-muted-foreground'>
        {message ?? t('dialog.loadingData')}
      </p>
    </div>
  )
}
