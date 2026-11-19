'use client'

/**
 * JobDetailPage - Full job configuration detail page with config edit + audit history
 *
 * Features:
 * - Enable/disable toggle
 * - Config form (cron, priority, concurrency, timeout, description)
 * - Metadata display (timezone, last update)
 * - Audit history table
 * - Auto-provider: creates NestJS adapter if no QueueApiProvider exists
 * - Auto-fetch: when jobName is passed, fetches config+history via hooks
 */

import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Save,
  Settings,
  History as HistoryIcon,
  Loader2,
} from 'lucide-react'
import { getSession } from 'next-auth/react'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { Switch } from '../../ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import { QueueApiProvider, useQueueApiOptional } from '../api/provider'
import { createNestJSAdapter } from '../api/adapters/nestjs-adapter'
import {
  useToggleJobEnabled,
  useUpdateJobConfig,
  useJobDetails,
  useJobHistory,
} from '../hooks'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'
import type { JobConfig, JobHistoryEntry } from '../types'

export interface JobDetailPageProps {
  /** Job name — auto-fetches config+history via hooks */
  jobName?: string
  /** API URL override (default: env var) */
  apiUrl?: string
  /** Pre-fetched config (backward compat, skips auto-fetch) */
  config?: JobConfig & {
    updatedByUser?: { name: string | null; email: string } | null
  }
  /** Pre-fetched history (backward compat, skips auto-fetch) */
  history?: JobHistoryEntry[]
  /** Back link href */
  backHref?: string
  /** Callback to navigate back */
  onBack?: () => void
  /** Callback after successful update (e.g. router.refresh()) */
  onRefresh?: () => void
}

/**
 * Auto-provider wrapper — creates NestJS adapter with defaults
 */
function WithAutoProvider({
  apiUrl,
  children,
}: {
  apiUrl?: string
  children: React.ReactNode
}) {
  const adapter = useMemo(
    () =>
      createNestJSAdapter({
        baseUrl:
          apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4080',
        getAuthToken: async () => {
          const session = await getSession()
          const user = session?.user as { accessToken?: string } | undefined
          return user?.accessToken ?? null
        },
        parseResponse: async res => {
          const data = await res.json()
          // Auto-detect superjson format ({ json: ..., meta: ... })
          if (data && typeof data === 'object' && 'json' in data) {
            return data.json
          }
          return data
        },
      }),
    [apiUrl]
  )

  return <QueueApiProvider adapter={adapter}>{children}</QueueApiProvider>
}

/**
 * Inner component that renders job detail UI
 */
function JobDetailPageInner({
  jobName,
  config: propConfig,
  history: propHistory,
  backHref,
  onBack,
  onRefresh,
}: Omit<JobDetailPageProps, 'apiUrl'>) {
  const t = useTelamonjsT()
  // Auto-fetch when jobName is provided and config is not
  const { data: fetchedConfig, isLoading: configLoading } = useJobDetails(
    !propConfig ? jobName : null
  )
  const { data: fetchedHistory, isLoading: historyLoading } = useJobHistory(
    !propHistory ? jobName : null
  )

  const config = propConfig || fetchedConfig
  const history = propHistory || fetchedHistory || []

  // Loading state (only when auto-fetching)
  if (!config && (configLoading || historyLoading)) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    )
  }

  // Not found state
  if (!config) {
    return (
      <div className='space-y-6 p-6'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={onBack}
            aria-label={t('queue.jobDetailPage.back')}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold'>{t('queue.jobDetailPage.notFound')}</h1>
            <p className='text-muted-foreground text-sm'>
              {jobName
                ? t('queue.jobDetailPage.notFoundWithName', { name: jobName })
                : t('queue.jobDetailPage.noJobSpecified')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <JobDetailPageUI
      config={config}
      history={history}
      backHref={backHref}
      onBack={onBack}
      onRefresh={onRefresh}
    />
  )
}

/**
 * Pure UI component (extracted to avoid conditional hooks)
 */
function JobDetailPageUI({
  config,
  history,
  backHref,
  onBack,
  onRefresh,
}: {
  config: JobConfig & {
    updatedByUser?: { name: string | null; email: string } | null
  }
  history: JobHistoryEntry[]
  backHref?: string
  onBack?: () => void
  onRefresh?: () => void
}) {
  const t = useTelamonjsT()
  const format = useFormat()
  const dateFnsLocale = useDateFnsLocale()
  const toggleJobMutation = useToggleJobEnabled()
  const updateJobMutation = useUpdateJobConfig()

  const [isToggling, setIsToggling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [enabled, setEnabled] = useState(config.enabled)

  const [formData, setFormData] = useState({
    cronPattern: config.cronPattern || '',
    priority: config.priority,
    concurrency: config.concurrency || '',
    timeout: config.timeout || '',
    description: config.description || '',
  })

  const handleToggle = async () => {
    setIsToggling(true)

    try {
      const result = await toggleJobMutation.mutateAsync({
        jobName: config.jobName,
        enabled: !enabled,
      })

      setEnabled(result.enabled)
      toast.success(result.enabled ? t('queue.jobDetailPage.activated') : t('queue.jobDetailPage.deactivated'), {
        description: t('queue.jobDetailPage.statusChangedSuccess', {
          name: config.jobName,
          status: result.enabled ? t('queue.jobDetailPage.statusActivated') : t('queue.jobDetailPage.statusDeactivated'),
        }),
      })
      onRefresh?.()
    } catch (error: unknown) {
      toast.error(t('queue.jobDetailPage.statusChangeError'), {
        description:
          (error instanceof Error ? error.message : undefined) ||
          t('queue.jobDetailPage.unknownError'),
      })
    } finally {
      setIsToggling(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    const updates = {
      cronPattern: formData.cronPattern || null,
      priority: formData.priority,
      concurrency: formData.concurrency ? Number(formData.concurrency) : null,
      timeout: formData.timeout ? Number(formData.timeout) : null,
      description: formData.description || null,
    }

    try {
      await updateJobMutation.mutateAsync({
        jobName: config.jobName,
        updates,
      })

      toast.success(t('queue.jobDetailPage.updated'), {
        description: t('queue.jobDetailPage.updatedDescription'),
      })
      onRefresh?.()
    } catch (error: unknown) {
      toast.error(t('queue.jobDetailPage.updateError'), {
        description:
          (error instanceof Error ? error.message : undefined) ||
          t('queue.jobDetailPage.unknownError'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'enabled':
        return <Badge className='bg-green-700'>{t('queue.jobDetailPage.actionEnabled')}</Badge>
      case 'disabled':
        return <Badge variant='secondary'>{t('queue.jobDetailPage.actionDisabled')}</Badge>
      case 'updated':
        return <Badge variant='outline'>{t('queue.jobDetailPage.actionUpdated')}</Badge>
      case 'created':
        return <Badge className='bg-blue-600'>{t('queue.jobDetailPage.actionCreated')}</Badge>
      default:
        return <Badge>{action}</Badge>
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backHref && typeof window !== 'undefined') {
      window.location.href = backHref
    }
  }

  return (
    <div className='space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleBack}
            aria-label={t('queue.jobDetailPage.back')}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              {config.jobName}
            </h1>
            <div className='mt-2 flex items-center gap-2'>
              <Badge variant='outline'>{config.module}</Badge>
              <Badge variant={enabled ? 'default' : 'secondary'}>
                {enabled ? t('queue.jobDetailPage.active') : t('queue.jobDetailPage.inactive')}
              </Badge>
              {config.orphan && (
                <Badge
                  variant='outline'
                  className='border-yellow-300 text-yellow-600'
                  title={t('queue.config.orphanHint')}
                >
                  {t('queue.config.orphan')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className='flex items-center gap-2'>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isToggling}
          />
          <span className='text-sm font-medium'>
            {enabled ? t('queue.jobDetailPage.active') : t('queue.jobDetailPage.inactive')}
          </span>
        </div>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings className='h-4 w-4' />
            {t('queue.jobDetailPage.settingsTitle')}
          </CardTitle>
          <CardDescription>
            {t('queue.jobDetailPage.settingsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='cronPattern'>
                <Calendar className='mr-1 inline h-3 w-3' />
                {t('queue.jobDetailPage.cronPattern')}
              </Label>
              <Input
                id='cronPattern'
                placeholder={t('queue.jobDetailPage.cronPlaceholder')}
                value={formData.cronPattern}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, cronPattern: e.target.value })
                }
              />
              <p className='text-muted-foreground text-xs'>
                {t('queue.jobDetailPage.cronHelp')}
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='priority'>{t('queue.jobDetailPage.priority')}</Label>
              <Input
                id='priority'
                type='number'
                min='1'
                max='10'
                value={formData.priority}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, priority: Number(e.target.value) })
                }
              />
              <p className='text-muted-foreground text-xs'>
                {t('queue.jobDetailPage.priorityHelp')}
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='concurrency'>{t('queue.jobDetailPage.concurrency')}</Label>
              <Input
                id='concurrency'
                type='number'
                min='1'
                placeholder={t('queue.jobDetailPage.concurrencyPlaceholder')}
                value={formData.concurrency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, concurrency: e.target.value })
                }
              />
              <p className='text-muted-foreground text-xs'>
                {t('queue.jobDetailPage.concurrencyHelp')}
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='timeout'>
                <Clock className='mr-1 inline h-3 w-3' />
                {t('queue.jobDetailPage.timeout')}
              </Label>
              <Input
                id='timeout'
                type='number'
                min='1000'
                placeholder={t('queue.jobDetailPage.timeoutPlaceholder')}
                value={formData.timeout}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, timeout: e.target.value })
                }
              />
              <p className='text-muted-foreground text-xs'>
                {t('queue.jobDetailPage.timeoutHelp')}
              </p>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>{t('queue.jobDetailPage.description')}</Label>
            <Textarea
              id='description'
              placeholder={t('queue.jobDetailPage.descriptionPlaceholder')}
              rows={3}
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className='flex justify-end'>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              data-testid='job-detail-save'
            >
              <Save className='mr-2 h-4 w-4' />
              {isSaving ? t('queue.jobDetailPage.saving') : t('queue.jobDetailPage.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{t('queue.jobDetailPage.additionalInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className='grid gap-4 md:grid-cols-2'>
            <div>
              <dt className='text-muted-foreground text-sm font-medium'>
                {t('queue.jobDetailPage.timezone')}
              </dt>
              <dd className='text-sm'>{config.timezone}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground text-sm font-medium'>
                {t('queue.jobDetailPage.lastUpdate')}
              </dt>
              <dd className='text-sm'>
                {config.updatedAt ? (
                  <>
                    {formatDistanceToNow(new Date(config.updatedAt), {
                      addSuffix: true,
                      locale: dateFnsLocale,
                    })}
                    {config.updatedByUser && (
                      <span className='text-muted-foreground'>
                        {' '}
                        {t('queue.jobDetailPage.updatedBy', {
                          name: config.updatedByUser.name || config.updatedByUser.email,
                        })}
                      </span>
                    )}
                  </>
                ) : (
                  <span className='text-muted-foreground'>—</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <HistoryIcon className='h-4 w-4' />
            {t('queue.jobDetailPage.historyTitle')}
          </CardTitle>
          <CardDescription>
            {t('queue.jobDetailPage.historyDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>
              {t('queue.jobDetailPage.noHistory')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('queue.jobDetailPage.columnDateTime')}</TableHead>
                  <TableHead>{t('queue.jobDetailPage.columnAction')}</TableHead>
                  <TableHead>{t('queue.jobDetailPage.columnChangedBy')}</TableHead>
                  <TableHead>{t('queue.jobDetailPage.columnBefore')}</TableHead>
                  <TableHead>{t('queue.jobDetailPage.columnAfter')}</TableHead>
                  <TableHead>{t('queue.jobDetailPage.columnReason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className='text-sm'>
                      {format.dateTime(entry.createdAt)}
                      <p className='text-muted-foreground text-xs'>
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                          locale: dateFnsLocale,
                        })}
                      </p>
                    </TableCell>
                    <TableCell>{getActionBadge(entry.action)}</TableCell>
                    <TableCell>
                      {entry.changedByUser ? (
                        <div>
                          <p className='text-sm font-medium'>
                            {entry.changedByUser.name ||
                              entry.changedByUser.email}
                          </p>
                          {entry.changedByUser.name && (
                            <p className='text-muted-foreground text-xs'>
                              {entry.changedByUser.email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>{t('queue.jobDetailPage.system')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.before ? (
                        <pre className='max-w-xs overflow-x-auto text-xs'>
                          {JSON.stringify(entry.before, null, 2)}
                        </pre>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.after ? (
                        <pre className='max-w-xs overflow-x-auto text-xs'>
                          {JSON.stringify(entry.after, null, 2)}
                        </pre>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell className='max-w-md'>
                      <p className='text-muted-foreground text-sm'>
                        {entry.reason || '—'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Main export — auto-provider + auto-fetch
 *
 * @example Zero-config usage (auto-provider + auto-fetch):
 * ```tsx
 * <JobDetailPage
 *   jobName="sync-clientes"
 *   onBack={() => router.push('/admin/ferramentas/jobs')}
 * />
 * ```
 *
 * @example With pre-fetched data (backward compatible):
 * ```tsx
 * <QueueApiProvider adapter={myAdapter}>
 *   <JobDetailPage config={config} history={history} onBack={...} />
 * </QueueApiProvider>
 * ```
 */
export default function JobDetailPage(props: JobDetailPageProps) {
  const { apiUrl, ...rest } = props
  const existingAdapter = useQueueApiOptional()

  if (existingAdapter) {
    return <JobDetailPageInner {...rest} />
  }

  return (
    <WithAutoProvider apiUrl={apiUrl}>
      <JobDetailPageInner {...rest} />
    </WithAutoProvider>
  )
}
