'use client'

import React, { useState, useMemo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../../utils/cn'
import { Switch } from '../../../ui/switch'
import { Input } from '../../../ui/input'
import { Badge } from '../../../ui/badge'
import {
  useAllJobs,
  useToggleJobEnabled,
  useToggleModuleJobs,
  useUpdateJobConfig,
} from '../../hooks'
import JobConfigDialog from '../JobConfigDialog'
import { useTelamonjsT } from '../../../i18n/use-t'
import { useQueueReadOnly } from '../read-only-context'
import { useQueueLabels } from '../labels-context'
import { ModuleIcon, type QueueModuleIcon } from '../module-icon'
import type { JobConfig } from '../../types'

const defaultModuleIcons: Record<string, QueueModuleIcon> = {
  alertas: '🚨',
  ancoras: '⚓',
  apisul: '🌐',
  cercas: '🚧',
  comandos: '🎮',
  email: '✉️',
  estatisticas: '📊',
  financeiro: '💰',
  gateway: '🔌',
  imports: '📥',
  invitations: '📨',
  legacy: '🗄️',
  maintenance: '🛠️',
  mysql: '🐬',
  operacoes: '⚙️',
  roteamento: '🗺️',
  sms: '💬',
  sync: '🔄',
  webhooks: '🔗',
  core: '🏠',
}

interface ConfiguracaoTabProps {
  moduleIcons?: Record<string, QueueModuleIcon>
}

export default function ConfiguracaoTab({
  moduleIcons: moduleIconsProp,
}: ConfiguracaoTabProps) {
  const t = useTelamonjsT()
  const readOnly = useQueueReadOnly()
  const icons = moduleIconsProp ?? defaultModuleIcons
  const { jobLabel, moduleLabel, orderModules } = useQueueLabels()

  const { data: allJobs, isLoading } = useAllJobs()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [togglingJobs, setTogglingJobs] = useState<Set<string>>(new Set())
  const [togglingModules, setTogglingModules] = useState<Set<string>>(new Set())
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null)

  const toggleJobMutation = useToggleJobEnabled()
  const toggleModuleMutation = useToggleModuleJobs()
  const updateJobMutation = useUpdateJobConfig()

  const jobs: JobConfig[] = useMemo(() => {
    if (!allJobs) return []
    return allJobs
  }, [allJobs])

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      enabled: jobs.filter(j => j.enabled).length,
      disabled: jobs.filter(j => !j.enabled).length,
    }
  }, [jobs])

  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs
    const query = searchQuery.toLowerCase()
    return jobs.filter(
      job =>
        job.jobName.toLowerCase().includes(query) ||
        job.module.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query)
    )
  }, [jobs, searchQuery])

  const jobsByModule = useMemo(() => {
    const grouped: Record<string, JobConfig[]> = {}
    filteredJobs.forEach(job => {
      if (!grouped[job.module]) grouped[job.module] = []
      grouped[job.module].push(job)
    })
    return grouped
  }, [filteredJobs])

  // Same group order as the Real-time queues table
  const sortedModules = useMemo(
    () => orderModules(Object.keys(jobsByModule)).map(m => [m, jobsByModule[m]] as const),
    [jobsByModule, orderModules]
  )

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(module)) {
      newExpanded.delete(module)
    } else {
      newExpanded.add(module)
    }
    setExpandedModules(newExpanded)
  }

  const getModuleStats = (moduleJobs: JobConfig[]) => ({
    enabled: moduleJobs.filter(j => j.enabled).length,
    disabled: moduleJobs.filter(j => !j.enabled).length,
    orphan: moduleJobs.filter(j => j.orphan).length,
  })

  const handleToggleJob = async (e: React.MouseEvent, jobName: string) => {
    e.stopPropagation()

    const currentJob = jobs.find(j => j.jobName === jobName)
    if (!currentJob) return

    setTogglingJobs(prev => new Set(prev).add(jobName))

    try {
      await toggleJobMutation.mutateAsync({
        jobName,
        enabled: !currentJob.enabled,
      })
      toast.success(currentJob.enabled ? t('queue.config.jobDeactivated') : t('queue.config.jobActivated'), {
        description: jobLabel(jobName),
      })
    } catch (error: unknown) {
      toast.error(t('queue.config.statusChangeError'), {
        description:
          (error instanceof Error ? error.message : undefined) ||
          t('queue.config.unknownError'),
      })
    } finally {
      setTogglingJobs(prev => {
        const next = new Set(prev)
        next.delete(jobName)
        return next
      })
    }
  }

  const handleToggleModule = async (module: string, enabled: boolean) => {
    setTogglingModules(prev => new Set(prev).add(module))

    try {
      const result: { updated: number; count?: number } =
        await toggleModuleMutation.mutateAsync({ module, enabled })
      toast.success(enabled ? t('queue.config.moduleActivated') : t('queue.config.moduleDeactivated'), {
        description: t('queue.config.jobsChangedCount', { count: result.count ?? result.updated }),
      })
    } catch (error: unknown) {
      toast.error(t('queue.config.moduleChangeError'), {
        description:
          (error instanceof Error ? error.message : undefined) ||
          t('queue.config.unknownError'),
      })
    } finally {
      setTogglingModules(prev => {
        const next = new Set(prev)
        next.delete(module)
        return next
      })
    }
  }

  const handleUpdateJob = async (
    jobName: string,
    updates: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      await updateJobMutation.mutateAsync({ jobName, updates })
      toast.success(t('queue.config.settingsUpdated'), { description: jobLabel(jobName) })
      return true
    } catch (error: unknown) {
      toast.error(t('queue.config.updateError'), {
        description:
          (error instanceof Error ? error.message : undefined) ||
          t('queue.config.unknownError'),
      })
      return false
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col gap-3 p-4'>
      {/* Toolbar: Search + Stats */}
      <div className='flex shrink-0 items-center justify-between gap-4'>
        <div className='relative max-w-sm flex-1'>
          <Search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
          <Input
            placeholder={t('queue.config.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='h-9 pl-9'
          />
        </div>
        <div className='flex shrink-0 items-center gap-4 text-sm'>
          <span className='text-muted-foreground'>
            {t('queue.config.jobCount', { count: stats.total })}
          </span>
          <span className='flex items-center gap-1.5 text-green-700 dark:text-green-400'>
            <span className='h-2 w-2 rounded-full bg-green-500' />
            {t('queue.config.activeCount', { count: stats.enabled })}
          </span>
          <span className='text-muted-foreground flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full bg-gray-400' />
            {t('queue.config.inactiveCount', { count: stats.disabled })}
          </span>
        </div>
      </div>

      {/* Accordion Modules */}
      <div className='bg-card min-h-0 flex-1 divide-y overflow-y-auto rounded-xl border'>
        {sortedModules.map(([module, moduleJobs]) => {
          const isExpanded = expandedModules.has(module)
          const moduleStats = getModuleStats(moduleJobs)
          const moduleIcon = icons[module] || '📦'
          const label = moduleLabel(module)
          const isTogglingModule = togglingModules.has(module)
          const allEnabled = moduleJobs.every(j => j.enabled)
          const allDisabled = moduleJobs.every(j => !j.enabled)

          return (
            <div key={module}>
              <div className='hover:bg-muted/50 flex items-center justify-between px-4 py-2.5 transition-colors'>
                <button
                  onClick={() => toggleModule(module)}
                  data-testid={`module-toggle-${module}`}
                  className='flex flex-1 items-center gap-2'
                >
                  {isExpanded ? (
                    <ChevronDown className='text-muted-foreground h-4 w-4' />
                  ) : (
                    <ChevronRight className='text-muted-foreground h-4 w-4' />
                  )}
                  <span className='text-base'>
                    <ModuleIcon icon={moduleIcon} />
                  </span>
                  <span className={cn('text-sm font-medium', !label && 'capitalize')}>
                    {label ?? module}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    · {moduleJobs.length}
                  </span>
                </button>

                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2 text-xs'>
                    {moduleStats.enabled > 0 && (
                      <span className='flex items-center gap-1 text-green-700 dark:text-green-400'>
                        <span className='h-1.5 w-1.5 rounded-full bg-green-500' />
                        {moduleStats.enabled}
                      </span>
                    )}
                    {moduleStats.disabled > 0 && (
                      <span className='text-muted-foreground'>
                        {t('queue.config.off', { count: moduleStats.disabled })}
                      </span>
                    )}
                    {moduleStats.orphan > 0 && (
                      <span className='flex items-center gap-1 text-yellow-600 dark:text-yellow-400'>
                        <AlertTriangle className='h-3 w-3' />
                        {moduleStats.orphan}
                      </span>
                    )}
                  </div>

                  <div className='flex gap-0.5'>
                    {!readOnly && !allEnabled && (
                      <button
                        onClick={() => handleToggleModule(module, true)}
                        disabled={isTogglingModule}
                        className='hover:bg-muted rounded p-1 transition-colors'
                        title={t('queue.config.activateAll')}
                        aria-label={t('queue.config.activateAllModule', { module: label ?? module })}
                      >
                        <Play
                          className={cn(
                            'h-3.5 w-3.5 text-green-700',
                            isTogglingModule && 'opacity-50'
                          )}
                        />
                      </button>
                    )}
                    {!readOnly && !allDisabled && (
                      <button
                        onClick={() => handleToggleModule(module, false)}
                        disabled={isTogglingModule}
                        className='hover:bg-muted rounded p-1 transition-colors'
                        title={t('queue.config.deactivateAll')}
                        aria-label={t('queue.config.deactivateAllModule', { module: label ?? module })}
                      >
                        <Pause
                          className={cn(
                            'h-3.5 w-3.5 text-yellow-600',
                            isTogglingModule && 'opacity-50'
                          )}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className='bg-muted/70 dark:bg-muted/60 border-t'>
                  {moduleJobs
                    .sort((a, b) => a.jobName.localeCompare(b.jobName))
                    .map(job => {
                      const isToggling = togglingJobs.has(job.jobName)
                      const title = jobLabel(job.jobName)

                      return (
                        <div
                          key={job.jobName}
                          onClick={() => !readOnly && setSelectedJob(job)}
                          className={cn(
                            'hover:bg-muted/50 flex cursor-pointer items-center justify-between border-b py-2.5 pl-10 pr-4 transition-colors last:border-b-0',
                            job.orphan && 'opacity-50',
                            !job.enabled && 'opacity-60'
                          )}
                        >
                          <div className='flex min-w-0 flex-1 items-center gap-3'>
                            <Switch
                              checked={job.enabled}
                              onCheckedChange={() => {}}
                              onClick={e => handleToggleJob(e, job.jobName)}
                              disabled={readOnly || isToggling}
                              className='shrink-0'
                            />
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-center gap-2'>
                                <span className='truncate text-sm font-medium' title={title}>
                                  {title}
                                </span>
                                {job.orphan && (
                                  <Badge
                                    variant='outline'
                                    className='shrink-0 border-yellow-300 px-1 py-0 text-[10px] text-yellow-600'
                                    title={t('queue.config.orphanHint')}
                                  >
                                    {t('queue.config.orphan')}
                                  </Badge>
                                )}
                              </div>
                              <p className='text-muted-foreground truncate text-xs'>
                                {/* No repeat when the title already is the description */}
                                {job.description && job.description !== title
                                  ? job.description
                                  : job.jobName}
                              </p>
                            </div>
                          </div>

                          <div className='ml-4 flex shrink-0 items-center gap-3'>
                            {job.cronPattern ? (
                              <code className='bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]'>
                                {job.cronPattern}
                              </code>
                            ) : (
                              <span className='text-muted-foreground text-[10px]'>
                                {t('queue.config.manual')}
                              </span>
                            )}
                            <Badge
                              variant='outline'
                              className='px-1.5 py-0 font-mono text-[10px]'
                            >
                              P{job.priority}
                            </Badge>
                            <Settings className='text-muted-foreground h-4 w-4' />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}

        {Object.keys(jobsByModule).length === 0 && (
          <div className='flex flex-col items-center justify-center py-12'>
            <Search className='text-muted-foreground h-12 w-12' />
            <h3 className='mt-4 text-lg font-semibold'>
              {t('queue.config.noJobsFound')}
            </h3>
            <p className='text-muted-foreground text-sm'>
              {t('queue.config.tryAdjustSearch')}
            </p>
          </div>
        )}
      </div>

      <JobConfigDialog
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onUpdate={handleUpdateJob}
      />
    </div>
  )
}
