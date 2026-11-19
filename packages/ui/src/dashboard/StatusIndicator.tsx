'use client'

import { Wifi, WifiOff, Loader2, AlertCircle, type LucideIcon } from 'lucide-react'
import { cn } from '../utils'
import { type DashboardStatus } from '../types/dashboard'
import { useTelamonjsT, useText } from '../i18n/use-t'
import type { I18nText } from '../i18n/msg'

const statusIconConfig: Record<
  DashboardStatus,
  { icon: LucideIcon; color: string; bg: string }
> = {
  online: { icon: Wifi, color: 'text-green-500', bg: 'bg-green-500' },
  offline: { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-500' },
  loading: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500' },
}

export interface StatusIndicatorProps {
  status: DashboardStatus
  label?: I18nText
  className?: string
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const t = useTelamonjsT()
  const text = useText()
  const statusLabels: Record<DashboardStatus, string> = {
    online: t('dashboard.statusOnline'),
    offline: t('dashboard.statusOffline'),
    loading: t('dashboard.statusLoading'),
    error: t('common.error'),
  }
  const config = statusIconConfig[status]
  const StatusIcon = config.icon

  return (
    <div className={cn('flex items-center gap-1.5 sm:gap-2 text-sm', className)}>
      <span className={cn('flex items-center gap-1.5', config.color)}>
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            config.bg,
            status === 'online' && 'animate-pulse'
          )}
        />
        <StatusIcon
          className={cn(
            'h-3.5 w-3.5',
            status === 'loading' && 'animate-spin'
          )}
        />
      </span>
      <span className='text-xs text-muted-foreground hidden sm:inline'>
        {text(label) || statusLabels[status]}
      </span>
    </div>
  )
}
