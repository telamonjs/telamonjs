'use client'

/**
 * FailureGroupsModal - a queue's failed jobs grouped by cause.
 * "38× Server has closed the connection between 03:31 and 03:34" says more
 * than 38 loose rows. Retry/discard per group goes through the bulk endpoint
 * with the group's `jobIds`; retry is hidden when the queue's contract has
 * `manualRetry: false` (the job owns its retries).
 *
 * Requires an adapter with `getFailureGroups` (see `useFailureGroups`).
 */

import { Fragment, useState } from 'react'
import { X, RefreshCw, Trash2, AlertCircle, List } from 'lucide-react'
import { toast } from 'sonner'
import { useFormatter } from 'next-intl'
import { cn } from '../../utils/cn'
import { useTelamonjsT } from '../../i18n/use-t'
import { useQueueReadOnly } from './read-only-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'
import { useBulkJobAction } from '../hooks/use-queue-actions'
import { useEscapeToClose } from '../hooks/use-escape-to-close'
import { useFailureGroups } from '../hooks/use-queue-health'
import { useQueueLabels } from './labels-context'
import JobsListModal from './JobsListModal'

export interface FailureGroupsModalProps {
  /** Queue to inspect; `null` keeps the modal closed. */
  queueName: string | null
  onClose: () => void
}

export default function FailureGroupsModal({ queueName, onClose }: FailureGroupsModalProps) {
  const t = useTelamonjsT()
  const { jobLabel } = useQueueLabels()
  const readOnly = useQueueReadOnly()
  const intl = useFormatter()
  const { data, isLoading, isError, refetch } = useFailureGroups(queueName)
  const bulk = useBulkJobAction()
  const [busy, setBusy] = useState<string | null>(null)
  const [showJobs, setShowJobs] = useState(false)
  // Bulk retry/discard of a whole group waits for an explicit confirmation
  const [pending, setPending] = useState<{ action: 'retry' | 'remove'; reason: string; jobIds: string[] } | null>(null)
  useEscapeToClose(!!queueName, onClose)

  if (!queueName) return null

  const fmt = (ms: number) =>
    intl.dateTime(new Date(ms), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  const run = async (action: 'retry' | 'remove', reason: string, jobIds: string[]) => {
    setBusy(`${action}:${reason}`)
    try {
      await bulk.mutateAsync({ action, jobs: jobIds.map((id) => ({ id, queueName })) })
      toast.success(
        t(action === 'retry' ? 'queue.failureGroupsModal.retried' : 'queue.failureGroupsModal.discarded', {
          count: jobIds.length,
        })
      )
    } catch {
      toast.error(t('queue.failureGroupsModal.actionError'))
    } finally {
      setBusy(null)
      void refetch()
    }
  }

  return (
    <Fragment>
      <div className='fixed inset-0 bg-black/50 z-50' onClick={onClose} />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='failure-groups-title'
        className='fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[85vh] bg-background rounded-xl shadow-2xl z-50 flex flex-col'
      >
        <div className='flex items-center justify-between px-6 py-4 border-b'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'>
              <AlertCircle className='h-5 w-5' />
            </div>
            <div>
              <h2 id='failure-groups-title' className='text-lg font-semibold'>
                {t('queue.failureGroupsModal.title')}
                <span className='text-muted-foreground font-normal'> - {jobLabel(queueName)}</span>
              </h2>
              <p className='text-sm text-muted-foreground'>
                {data ? (
                  <>
                    {t('queue.failureGroupsModal.summary', { total: data.total, groups: data.groups.length })}
                    {data.scanned < data.total && (
                      <> · {t('queue.failureGroupsModal.sampled', { scanned: data.scanned })}</>
                    )}
                  </>
                ) : isError ? (
                  t('queue.failureGroupsModal.loadError')
                ) : (
                  t('queue.failureGroupsModal.loading')
                )}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => setShowJobs(true)}
              data-testid='failure-groups-view-jobs'
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors'
              title={t('queue.failureGroupsModal.viewJobs')}
            >
              <List className='h-3.5 w-3.5' />
              {t('queue.failureGroupsModal.jobs')}
            </button>
            <button
              onClick={onClose}
              aria-label={t('queue.failureGroupsModal.close')}
              className='p-2 rounded-lg hover:bg-muted transition-colors'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </div>

        {data && !data.manualRetry && (
          <div className='px-6 py-2 text-xs border-b bg-muted/40 text-muted-foreground'>
            {t('queue.failureGroupsModal.noManualRetry')}
          </div>
        )}

        <div className='flex-1 overflow-y-auto divide-y'>
          {isLoading && (
            <div className='flex items-center justify-center py-10 text-muted-foreground text-sm'>
              <RefreshCw className='h-4 w-4 animate-spin mr-2' />
              {t('queue.failureGroupsModal.loadingFailures')}
            </div>
          )}
          {isError && (
            <div className='py-10 px-6 text-center text-sm text-muted-foreground space-y-3'>
              <p>{t('queue.failureGroupsModal.loadError')}</p>
              <button
                onClick={() => setShowJobs(true)}
                data-testid='failure-groups-error-view-jobs'
                className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors'
              >
                <List className='h-3.5 w-3.5' />
                {t('queue.failureGroupsModal.viewJobs')}
              </button>
            </div>
          )}
          {data && data.groups.length === 0 && (
            <div className='py-10 text-center text-sm text-muted-foreground'>
              {t('queue.failureGroupsModal.empty')}
            </div>
          )}
          {data?.groups.map((g) => (
            <div key={g.reason} className='px-6 py-3 flex gap-4 items-start'>
              <div className='shrink-0 w-14 text-right'>
                <span className='text-lg font-semibold text-red-600 dark:text-red-400'>{intl.number(g.count)}×</span>
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium break-words'>{g.reason}</p>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {g.count > 1 ? `${fmt(g.firstAt)} → ${fmt(g.lastAt)}` : fmt(g.lastAt)}
                </p>
                {g.sample.trim() !== g.reason && (
                  <details className='mt-1'>
                    <summary className='text-xs text-muted-foreground cursor-pointer'>
                      {t('queue.failureGroupsModal.fullMessage')}
                    </summary>
                    <pre className='mt-1 text-[11px] whitespace-pre-wrap bg-muted/50 rounded p-2 max-h-40 overflow-auto'>
                      {g.sample}
                    </pre>
                  </details>
                )}
              </div>
              {!readOnly && (
              <div className='shrink-0 flex gap-1'>
                {data.manualRetry && (
                  <button
                    onClick={() => setPending({ action: 'retry', reason: g.reason, jobIds: g.jobIds })}
                    disabled={!!busy}
                    className='flex items-center gap-1 px-2 py-1 text-xs rounded-md text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 disabled:opacity-50'
                    title={t('queue.failureGroupsModal.retryCount', { count: g.jobIds.length })}
                    aria-label={t('queue.failureGroupsModal.retryCount', { count: g.jobIds.length })}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', busy === `retry:${g.reason}` && 'animate-spin')} />
                    {t('queue.failureGroupsModal.retry')}
                  </button>
                )}
                <button
                  onClick={() => setPending({ action: 'remove', reason: g.reason, jobIds: g.jobIds })}
                  disabled={!!busy}
                  className='flex items-center gap-1 px-2 py-1 text-xs rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50'
                  title={t('queue.failureGroupsModal.discardCount', { count: g.jobIds.length })}
                  aria-label={t('queue.failureGroupsModal.discardCount', { count: g.jobIds.length })}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  {t('queue.failureGroupsModal.discard')}
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open: boolean) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t(
                    pending.action === 'retry'
                      ? 'queue.failureGroupsModal.confirmRetryTitle'
                      : 'queue.failureGroupsModal.confirmDiscardTitle'
                  )}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    pending.action === 'retry'
                      ? 'queue.failureGroupsModal.confirmRetryDescription'
                      : 'queue.failureGroupsModal.confirmDiscardDescription',
                    { count: pending.jobIds.length, reason: pending.reason }
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  data-testid='failure-groups-confirm'
                  className={
                    pending.action === 'remove'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : undefined
                  }
                  onClick={() => {
                    const { action, reason, jobIds } = pending
                    setPending(null)
                    void run(action, reason, jobIds)
                  }}
                >
                  {t(
                    pending.action === 'retry'
                      ? 'queue.failureGroupsModal.retryCount'
                      : 'queue.failureGroupsModal.discardCount',
                    { count: pending.jobIds.length }
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <JobsListModal
        status={showJobs ? 'failed' : null}
        queueName={queueName}
        queueDisplayName={jobLabel(queueName)}
        manualRetry={data?.manualRetry}
        onClose={() => {
          setShowJobs(false)
          void refetch()
        }}
      />
    </Fragment>
  )
}
