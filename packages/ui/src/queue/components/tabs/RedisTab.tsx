'use client'

/**
 * RedisTab - Redis connection pool metrics with health thresholds
 */

import { useFormatter } from 'next-intl'
import { Database, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '../../../ui/badge'
import { useRedisMetrics } from '../../hooks'
import { useTelamonjsT } from '../../../i18n/use-t'
import { useFormat } from '../../../i18n/use-format'

function getUtilizationClassName(percent: number) {
  if (percent >= 90) return 'border-destructive/50 bg-destructive/10 text-destructive'
  if (percent >= 75) return 'border-orange-500/50 bg-orange-500/10 text-orange-600'
  if (percent >= 50) return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700'
  return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600'
}

function getUtilizationIcon(percent: number) {
  if (percent >= 90) return <XCircle className="h-5 w-5" />
  if (percent >= 75) return <AlertTriangle className="h-5 w-5" />
  return <CheckCircle2 className="h-5 w-5" />
}

function getUtilizationLabel(percent: number, t: ReturnType<typeof useTelamonjsT>) {
  if (percent >= 90) return t('queue.redis.critical')
  if (percent >= 75) return t('queue.redis.high')
  if (percent >= 50) return t('queue.redis.warning')
  return t('queue.redis.healthy')
}

export default function RedisTab() {
  const t = useTelamonjsT()
  const format = useFormat()
  const intlFormat = useFormatter()
  const { data: metrics, isLoading, error } = useRedisMetrics()

  if (error) {
    return (
      <div className="p-6">
        <div className="border-destructive/50 rounded-xl border p-6">
          <div className="mb-2 flex items-center gap-2">
            <Database className="text-destructive h-5 w-5" />
            <h3 className="font-semibold">{t('queue.redis.title')}</h3>
          </div>
          <p className="text-destructive text-sm">{t('queue.redis.loadError')}</p>
        </div>
      </div>
    )
  }

  if (isLoading || !metrics || metrics.utilization_percent === undefined) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Database className="text-muted-foreground h-5 w-5" />
            <h3 className="font-semibold">{t('queue.redis.title')}</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('queue.redis.loadingMetrics')}
          </p>
        </div>
      </div>
    )
  }

  const utilizationClassName = getUtilizationClassName(
    metrics.utilization_percent ?? 0
  )
  const utilizationIcon = getUtilizationIcon(metrics.utilization_percent ?? 0)
  const utilizationLabel = getUtilizationLabel(metrics.utilization_percent ?? 0, t)
  const percent = metrics.utilization_percent ?? 0

  return (
    <div className="space-y-6 p-6">
      {/* Main Metric Card */}
      <div
        className={`rounded-xl border p-6 ${
          percent >= 90
            ? 'border-destructive/50 bg-destructive/5'
            : percent >= 75
            ? 'border-orange-500/50 bg-orange-500/5'
            : ''
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6" />
            <h3 className="text-lg font-semibold">{t('queue.redis.titlePool')}</h3>
          </div>
          <Badge
            variant="outline"
            className={`flex items-center gap-1 px-3 py-1 text-sm ${utilizationClassName}`}
          >
            {utilizationIcon}
            {utilizationLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Connections */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {metrics.connected_clients ?? 0}
              </span>
              <span className="text-muted-foreground text-lg">
                / {metrics.max_clients ?? 0}
              </span>
            </div>
            <div className="text-muted-foreground mt-1 text-sm">
              {t('queue.redis.activeConnections')}
            </div>
          </div>

          {/* Utilization Bar */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t('queue.redis.utilization')}</span>
              <span className="text-sm font-bold">{percent.toFixed(1)}%</span>
            </div>
            <div className="bg-muted h-4 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${
                  percent >= 90
                    ? 'bg-destructive'
                    : percent >= 75
                    ? 'bg-orange-500'
                    : percent >= 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-muted-foreground mb-1 text-sm">
            {t('queue.redis.activeConnections')}
          </div>
          <div className="text-2xl font-bold">
            {format.number(metrics.connected_clients ?? 0)}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-muted-foreground mb-1 text-sm">
            {t('queue.redis.totalReceived')}
          </div>
          <div className="text-2xl font-bold">
            {format.number(metrics.total_connections_received ?? 0)}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-muted-foreground mb-1 text-sm">{t('queue.redis.rejected')}</div>
          <div
            className={`text-2xl font-bold ${
              (metrics.rejected_connections ?? 0) > 0
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {format.number(metrics.rejected_connections ?? 0)}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-muted-foreground text-right text-xs">
        {t('queue.redis.updated', {
          time: intlFormat.dateTime(new Date(metrics.timestamp ?? new Date().toISOString()), {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        })}
      </div>
    </div>
  )
}
