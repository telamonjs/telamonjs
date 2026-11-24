'use client'

/**
 * DispatchJobModal - Modal for manually dispatching a job
 */

import { Fragment, useId, useState } from 'react'
import { X, Play, RefreshCw, Info, Zap, Code, AlertCircle } from 'lucide-react'
import { cn } from '../../utils/cn'
import { logger } from '../../utils/logger'
import { toast } from 'sonner'
import { useQueueApi } from '../api/provider'
import { useTelamonjsT } from '../../i18n/use-t'
import { useQueueLabels } from './labels-context'
import { useEscapeToClose } from '../hooks/use-escape-to-close'

interface JobContractInfo {
  name: string
  displayName: string
  module: string
  description: string
  dispatchable: boolean
}

interface SchemaField {
  name: string
  type: string
  required: boolean
  description?: string
}

interface DispatchJobModalProps {
  job: JobContractInfo | null
  onClose: () => void
  onSuccess?: () => void
  /** Custom schema fields configuration for jobs that require input */
  knownSchemaFields?: Record<string, SchemaField[]>
}

// Default known schema fields for jobs that require input
function getDefaultKnownSchemaFields(t: ReturnType<typeof useTelamonjsT>): Record<string, SchemaField[]> {
  return {
    'roteamento_processar-pontos-rota': [
      {
        name: 'rotaId',
        type: 'string',
        required: true,
        description: t('queue.dispatch.defaultFields.rotaId')
      }
    ],
    'gateway_processar-ids': [
      {
        name: 'ids',
        type: 'array',
        required: true,
        description: t('queue.dispatch.defaultFields.ids')
      }
    ],
    'operacoes_processar-relatorio': [
      {
        name: 'relatorioId',
        type: 'string',
        required: true,
        description: t('queue.dispatch.defaultFields.relatorioId')
      }
    ],
    'webhooks_send-vx-consult': [
      {
        name: 'produtoId',
        type: 'string',
        required: true,
        description: t('queue.dispatch.defaultFields.produtoId')
      },
      {
        name: 'tipo',
        type: 'string',
        required: true,
        description: t('queue.dispatch.defaultFields.tipo')
      }
    ],
    'sms_processar-sms-agendado': [
      {
        name: 'smsId',
        type: 'string',
        required: true,
        description: t('queue.dispatch.defaultFields.smsId')
      }
    ],
    'estatisticas_selector': [
      {
        name: 'dataHora',
        type: 'string',
        required: false,
        description: t('queue.dispatch.defaultFields.dataHora')
      }
    ]
  }
}

function parseJsonArray(text: string): unknown[] | null {
  try {
    const value: unknown = JSON.parse(text)
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

export default function DispatchJobModal({
  job,
  onClose,
  onSuccess,
  knownSchemaFields
}: DispatchJobModalProps) {
  const t = useTelamonjsT()
  const defaultKnownSchemaFields = getDefaultKnownSchemaFields(t)
  const resolvedSchemaFields = knownSchemaFields ?? defaultKnownSchemaFields
  const api = useQueueApi()
  const { jobLabel } = useQueueLabels()
  const [dispatching, setDispatching] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonData, setJsonData] = useState('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const fieldIdPrefix = useId()
  useEscapeToClose(!!job, onClose)

  const schemaFields = job ? resolvedSchemaFields[job.name] : undefined
  const hasRequiredFields = schemaFields && schemaFields.some((f) => f.required)

  // Reset form when job changes, computed during render (not an effect) per
  // React's "adjusting state when a prop changes" pattern.
  const [prevJobName, setPrevJobName] = useState(job?.name)
  if (job?.name !== prevJobName) {
    setPrevJobName(job?.name)
    setFormData({})
    setJsonData('{}')
    setJsonError(null)
    setJsonMode(false)
  }

  if (!job) return null
  const title = jobLabel(job.name, job.displayName)

  const validateJson = (text: string): boolean => {
    try {
      JSON.parse(text)
      setJsonError(null)
      return true
    } catch {
      setJsonError(t('queue.dispatch.invalidJson'))
      return false
    }
  }

  const handleDispatch = async () => {
    if (!job.dispatchable) {
      toast.error(t('queue.dispatch.notDispatchable'))
      return
    }

    // Validate required fields
    if (schemaFields && !jsonMode) {
      const missingFields = schemaFields
        .filter((f) => f.required && !formData[f.name])
        .map((f) => f.name)

      if (missingFields.length > 0) {
        toast.error(t('queue.dispatch.requiredFields', { fields: missingFields.join(', ') }))
        return
      }
    }

    // Validate JSON if in JSON mode
    if (jsonMode && !validateJson(jsonData)) {
      toast.error(t('queue.dispatch.invalidJson'))
      return
    }

    // Array fields are typed as JSON (see their placeholder): send the array
    let data: Record<string, unknown>
    if (jsonMode) {
      data = JSON.parse(jsonData)
    } else {
      data = { ...formData }
      for (const f of schemaFields ?? []) {
        if (f.type !== 'array' || !formData[f.name]) continue
        const parsed = parseJsonArray(formData[f.name])
        if (!parsed) {
          toast.error(t('queue.dispatch.invalidJson'))
          return
        }
        data[f.name] = parsed
      }
    }

    setDispatching(true)
    try {
      const result = await api.dispatchJob({
        queueName: job.name,
        data
      })

      toast.success(t('queue.dispatch.dispatched', { name: title }), {
        description: t('queue.dispatch.dispatchedId', { id: result.jobId })
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      logger.error('Error dispatching job', {
        error: err instanceof Error ? err : String(err),
      })
      toast.error(t('queue.dispatch.dispatchError'), {
        description: err instanceof Error ? err.message : t('queue.dispatch.unknownError')
      })
    } finally {
      setDispatching(false)
    }
  }

  const moduleColors: Record<string, string> = {
    imports: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    gateway:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    roteamento:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    operacoes:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    webhooks:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    sync: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    sms: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
  }

  const moduleColor =
    moduleColors[job.module] ||
    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${fieldIdPrefix}-title`}
        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-background rounded-xl shadow-2xl z-50 flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 id={`${fieldIdPrefix}-title`} className="text-lg font-semibold">
                {t('queue.dispatch.title')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('queue.dispatch.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={t('queue.dispatch.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Job Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-medium',
                  moduleColor
                )}
              >
                {job.module.toUpperCase()}
              </span>
              <span className="font-medium">{title}</span>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {job.description}
                </p>
              </div>
              <code className="block text-xs font-mono text-muted-foreground">
                {t('queue.dispatch.queueLabel', { name: job.name })}
              </code>
            </div>

            {!job.dispatchable && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {t('queue.dispatch.notDispatchableInfo')}
                </p>
              </div>
            )}

            {/* Input Fields */}
            {job.dispatchable && (schemaFields || hasRequiredFields) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t('queue.dispatch.inputDataTitle')}</h3>
                  <button
                    onClick={() => setJsonMode(!jsonMode)}
                    data-testid="dispatch-toggle-json-mode"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Code className="h-3 w-3" />
                    {jsonMode ? t('queue.dispatch.formMode') : t('queue.dispatch.jsonMode')}
                  </button>
                </div>

                {jsonMode ? (
                  <div className="space-y-2">
                    <textarea
                      value={jsonData}
                      onChange={(e) => {
                        setJsonData(e.target.value)
                        validateJson(e.target.value)
                      }}
                      className={cn(
                        'w-full h-32 px-3 py-2 text-sm font-mono bg-muted rounded-lg border resize-none',
                        jsonError && 'border-red-500'
                      )}
                      placeholder='{"rotaId": "..."}'
                    />
                    {jsonError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {jsonError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schemaFields?.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <label
                          htmlFor={`${fieldIdPrefix}-field-${field.name}`}
                          className="text-sm font-medium flex items-center gap-1"
                        >
                          {field.name}
                          {field.required && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        {field.description && (
                          <p className="text-xs text-muted-foreground">
                            {field.description}
                          </p>
                        )}
                        <input
                          id={`${fieldIdPrefix}-field-${field.name}`}
                          type="text"
                          value={formData[field.name] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: e.target.value
                            }))
                          }
                          className="w-full px-3 py-2 text-sm bg-muted rounded-lg border"
                          placeholder={
                            field.type === 'array'
                              ? '["id1", "id2"]'
                              : `${field.name}...`
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No required fields info */}
            {job.dispatchable && !schemaFields && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t('queue.dispatch.noInputNeeded')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <button
            onClick={onClose}
            data-testid="dispatch-cancel"
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
          >
            {t('common.cancel')}
          </button>

          {job.dispatchable && (
            <button
              onClick={handleDispatch}
              disabled={dispatching}
              data-testid="dispatch-execute"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {dispatching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {t('queue.dispatch.executeNow')}
            </button>
          )}
        </div>
      </div>
    </Fragment>
  )
}
