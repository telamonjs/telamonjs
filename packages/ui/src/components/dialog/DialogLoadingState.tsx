'use client'

import { Loader2 } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'

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
