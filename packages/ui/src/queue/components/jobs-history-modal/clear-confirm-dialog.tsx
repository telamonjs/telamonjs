'use client'

/**
 * "Clear history" confirmation modal. Extracted from JobsHistoryModal.tsx
 * (Fase A2). See fullscreen-modal.tsx for why this is module-level with
 * explicit props.
 */

import { CheckCircle, XCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useTelamonjsT } from '../../../i18n/use-t'

export interface ClearConfirmDialogProps {
  stats: { completed?: number; failed?: number }
  isClearing: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ClearConfirmDialog({
  stats,
  isClearing,
  onCancel,
  onConfirm,
}: ClearConfirmDialogProps) {
  const t = useTelamonjsT()
  return (
    <>
      <div
        className='fixed inset-0 bg-black/50 z-[70] animate-in fade-in duration-200'
        onClick={onCancel}
      />
      <div className='fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl shadow-2xl z-[70] p-6 animate-in zoom-in-95 duration-200'>
        <div className='flex items-center gap-4 mb-4'>
          <div className='p-3 rounded-full bg-red-100 dark:bg-red-950/30'>
            <AlertTriangle className='h-6 w-6 text-red-600 dark:text-red-400' />
          </div>
          <div>
            <h3 className='text-lg font-semibold'>{t('queue.history.clearHistoryTitle')}</h3>
            <p className='text-sm text-muted-foreground'>
              {t('queue.history.clearHistoryIrreversible')}
            </p>
          </div>
        </div>

        <p className='text-sm text-muted-foreground mb-4'>
          {t('queue.history.clearHistoryConfirmBody')}
        </p>

        <div className='flex items-center gap-4 mb-6 p-3 rounded-lg bg-muted/50'>
          <div className='flex items-center gap-2'>
            <CheckCircle className='h-4 w-4 text-green-500' />
            <span className='text-sm'>
              <span className='font-semibold text-green-700'>
                {stats.completed || 0}
              </span>{' '}
              {t('queue.history.completedCount')}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <XCircle className='h-4 w-4 text-red-500' />
            <span className='text-sm'>
              <span className='font-semibold text-red-600'>
                {stats.failed || 0}
              </span>{' '}
              {t('queue.history.failedCount')}
            </span>
          </div>
          <div className='ml-auto text-sm font-medium'>
            {t('queue.history.total', { count: (stats.completed || 0) + (stats.failed || 0) })}
          </div>
        </div>

        <div className='flex items-center justify-end gap-3'>
          <button
            onClick={onCancel}
            disabled={isClearing}
            data-testid='clear-history-cancel'
            className='px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors'
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isClearing}
            data-testid='clear-history-confirm'
            className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50'
          >
            {isClearing ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Trash2 className='h-4 w-4' />
            )}
            {isClearing ? t('queue.history.clearing') : t('queue.history.clearHistoryTitle')}
          </button>
        </div>
      </div>
    </>
  )
}
