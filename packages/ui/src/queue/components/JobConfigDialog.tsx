'use client'

/**
 * JobConfigDialog - Edit job configuration (cron, priority, concurrency, timeout, description)
 */

import { Fragment, useState } from 'react'
import {
  X,
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { useTelamonjsT } from '../../i18n/use-t'
import { useEscapeToClose } from '../hooks/use-escape-to-close'
import type { JobConfig } from '../types'

interface JobConfigDialogProps {
  job: JobConfig | null
  onClose: () => void
  onUpdate: (jobName: string, updates: Record<string, unknown>) => Promise<boolean>
}

export default function JobConfigDialog({
  job,
  onClose,
  onUpdate
}: JobConfigDialogProps) {
  const t = useTelamonjsT()
  const [saving, setSaving] = useState(false)
  useEscapeToClose(!!job, onClose)
  const [formData, setFormData] = useState({
    cronPattern: '',
    priority: 5,
    concurrency: '',
    timeout: '',
    description: ''
  })

  // Reset form when the job prop changes, computed during render (not an
  // effect) per React's "adjusting state when a prop changes" pattern.
  const [prevJob, setPrevJob] = useState(job)
  if (job !== prevJob) {
    setPrevJob(job)
    if (job) {
      setFormData({
        cronPattern: job.cronPattern || '',
        priority: job.priority || 5,
        concurrency: job.concurrency ? String(job.concurrency) : '',
        timeout: job.timeout ? String(job.timeout) : '',
        description: job.description || ''
      })
    }
  }

  if (!job) return null

  const handleSave = async () => {
    setSaving(true)
    const success = await onUpdate(job.jobName, {
      cronPattern: formData.cronPattern || null,
      priority: formData.priority,
      concurrency: formData.concurrency ? Number(formData.concurrency) : null,
      timeout: formData.timeout ? Number(formData.timeout) : null,
      description: formData.description || null
    })
    setSaving(false)
    if (success) onClose()
  }

  return (
    <Fragment>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="bg-background fixed inset-4 z-50 flex flex-col rounded-xl shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{t('queue.jobConfigDialog.title')}</h2>
            <p className="text-muted-foreground font-mono text-sm">
              {job.jobName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-muted rounded-lg p-2 transition-colors"
            aria-label={t('queue.jobConfigDialog.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{job.module}</Badge>
            <Badge variant={job.enabled ? 'default' : 'secondary'}>
              {job.enabled ? t('queue.jobConfigDialog.active') : t('queue.jobConfigDialog.inactive')}
            </Badge>
            {job.orphan && (
              <Badge
                variant="outline"
                className="border-yellow-300 text-yellow-600"
                title={t('queue.config.orphanHint')}
              >
                {t('queue.config.orphan')}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('queue.jobConfigDialog.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('queue.jobConfigDialog.descriptionPlaceholder')}
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="cronPattern">
                <Calendar className="mr-1 inline h-3 w-3" />
                {t('queue.jobConfigDialog.cronPattern')}
              </Label>
              <Input
                id="cronPattern"
                placeholder={t('queue.jobConfigDialog.cronPlaceholder')}
                value={formData.cronPattern}
                onChange={(e) =>
                  setFormData({ ...formData, cronPattern: e.target.value })
                }
                className="font-mono"
              />
              <p className="text-muted-foreground text-xs">
                {t('queue.jobConfigDialog.cronHelp')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('queue.jobConfigDialog.priority')}</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concurrency">{t('queue.jobConfigDialog.concurrency')}</Label>
              <Input
                id="concurrency"
                type="number"
                min="1"
                placeholder="1"
                value={formData.concurrency}
                onChange={(e) =>
                  setFormData({ ...formData, concurrency: e.target.value })
                }
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="timeout">
                <Clock className="mr-1 inline h-3 w-3" />
                {t('queue.jobConfigDialog.timeout')}
              </Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                placeholder={t('queue.jobConfigDialog.timeoutPlaceholder')}
                value={formData.timeout}
                onChange={(e) =>
                  setFormData({ ...formData, timeout: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="bg-muted/30 flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose} data-testid="job-config-cancel">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-testid="job-config-save"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {saving ? t('queue.jobConfigDialog.saving') : t('queue.jobConfigDialog.save')}
          </Button>
        </div>
      </div>
    </Fragment>
  )
}
