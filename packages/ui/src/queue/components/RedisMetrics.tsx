'use client'

/**
 * Redis Connection Metrics Widget
 *
 * Displays real-time Redis connection pool health with color-coded alerts:
 * - Green (<50%): Healthy
 * - Yellow (50-75%): Warning
 * - Orange (75-90%): High utilization
 * - Red (>90%): Critical
 *
 * Polls through useRedisMetrics (React Query).
 */

import { useFormatter } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Database, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useRedisMetrics } from '../hooks'
import { useTelamonjsT } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'

function getUtilizationClassName(percent: number) {
  if (percent >= 90) return 'border-destructive/50 bg-destructive/10 text-destructive' // Red (critical)
  if (percent >= 75) return 'border-orange-500/50 bg-orange-500/10 text-orange-600' // Orange (high)
  if (percent >= 50) return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700' // Yellow (warning)
  return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' // Green (healthy)
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

export default function RedisMetrics() {
  const t = useTelamonjsT()
  const format = useFormat()
  const intlFormat = useFormatter()
  // React Query hook - substitui manual polling
  const { data: metrics, isLoading, error } = useRedisMetrics()

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t('queue.redis.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            {t('queue.redis.loadError')}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !metrics || metrics.utilization_percent === undefined) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4 animate-pulse" />
            {t('queue.redis.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{t('queue.redis.loading')}</div>
        </CardContent>
      </Card>
    )
  }

  const utilizationClassName = getUtilizationClassName(
    metrics.utilization_percent ?? 0
  )
  const utilizationIcon = getUtilizationIcon(metrics.utilization_percent ?? 0)
  const utilizationLabel = getUtilizationLabel(metrics.utilization_percent ?? 0, t)

  return (
    <Card
      className={
        metrics.utilization_percent >= 90
          ? 'border-destructive/50 bg-destructive/5'
          : metrics.utilization_percent >= 75
          ? 'border-orange-500/50 bg-orange-500/5'
          : ''
      }
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t('queue.redis.title')}
          </span>
          <Badge
            variant="outline"
            className={`flex items-center gap-1 ${utilizationClassName}`}
          >
            {utilizationIcon}
            {utilizationLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Metric */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {metrics.connected_clients ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">
                / {metrics.max_clients ?? 0}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('queue.redis.activeConnections')}
            </div>
          </div>

          {/* Utilization Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">{t('queue.redis.utilization')}</span>
              <span className="text-xs font-medium">
                {(metrics.utilization_percent ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  (metrics.utilization_percent ?? 0) >= 90
                    ? 'bg-destructive'
                    : (metrics.utilization_percent ?? 0) >= 75
                    ? 'bg-orange-500'
                    : (metrics.utilization_percent ?? 0) >= 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(metrics.utilization_percent ?? 0, 100)}%`
                }}
              />
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
            <div>
              <div className="text-muted-foreground">{t('queue.redis.totalReceived')}</div>
              <div className="font-medium">
                {format.number(metrics.total_connections_received ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('queue.redis.rejected')}</div>
              <div
                className={`font-medium ${
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
          <div className="text-[10px] text-muted-foreground pt-1 border-t">
            {t('queue.redis.updated', {
              time: intlFormat.dateTime(new Date(metrics.timestamp ?? new Date().toISOString()), {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
