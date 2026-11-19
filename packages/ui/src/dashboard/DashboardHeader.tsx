'use client'

import { memo, useMemo, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  Pencil,
  Check,
  Search,
} from 'lucide-react'
import { cn } from '../utils'
import { Button } from '../ui/button'
import { type DashboardHeaderProps } from '../types/dashboard'
import { StatusIndicator } from './StatusIndicator'
import { getIcon } from '../utils/icon'
import { useTelamonjsT, useText } from '../i18n/use-t'
import { useDateFnsLocale } from '../i18n/use-date-fns-locale'

/**
 * DashboardHeader - Compact secondary header with status indicators
 *
 * Features:
 * - Status indicator with pulse animation (online)
 * - Search input
 * - Last update timestamp (formatDistanceToNow)
 * - Auto-refresh toggle
 * - Refresh button
 * - Edit mode toggle (for DashboardGrid)
 * - Fullscreen toggle
 * - Custom actions
 *
 * Performance: memo + useCallback to avoid re-rendering children
 *
 * @example
 * ```tsx
 * <DashboardHeader
 *   title="My Assets"
 *   description="Real-time monitoring"
 *   icon={Truck}
 *   status="online"
 *   statusLabel="42 assets"
 *   lastUpdate={new Date()}
 *   isRefreshing={false}
 *   onRefresh={() => refetch()}
 *   autoRefresh={true}
 *   onAutoRefreshToggle={(enabled) => setAutoRefresh(enabled)}
 *   allowFullscreen={true}
 *   onFullscreenToggle={() => setFullscreen(!fullscreen)}
 * />
 * ```
 */
export const DashboardHeader = memo(function DashboardHeader({
  title,
  description,
  icon: iconProp,
  status = 'online',
  statusLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  lastUpdate,
  isRefreshing,
  onRefresh,
  autoRefresh,
  onAutoRefreshToggle,
  allowFullscreen,
  isFullscreen,
  onFullscreenToggle,
  editable,
  onEditToggle,
  actions,
  className,
}: DashboardHeaderProps) {
  const t = useTelamonjsT()
  const text = useText()
  const dateFnsLocale = useDateFnsLocale()
  const Icon = iconProp
    ? typeof iconProp === 'string'
      ? getIcon(iconProp)
      : iconProp
    : null

  // Performance: memoize date formatting
  const formattedLastUpdate = useMemo(() => {
    if (!lastUpdate) return null
    const now = new Date()
    const diff = now.getTime() - lastUpdate.getTime()

    if (diff < 60000) return t('dashboard.now')
    return formatDistanceToNow(lastUpdate, { addSuffix: true, locale: dateFnsLocale })
  }, [lastUpdate, t, dateFnsLocale])

  // Performance: memoize callbacks to avoid breaking children's memo
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(e.target.value)
    },
    [onSearchChange]
  )

  const handleAutoRefreshToggle = useCallback(() => {
    onAutoRefreshToggle?.(!autoRefresh)
  }, [onAutoRefreshToggle, autoRefresh])

  const handleEditToggle = useCallback(() => {
    onEditToggle?.(!editable)
  }, [onEditToggle, editable])

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm shrink-0',
        className
      )}
    >
      {/* Left: Title + Icon */}
      <div className='flex items-center gap-3 min-w-0'>
        {Icon && (
          <div className='p-2 rounded-lg bg-primary/10 shrink-0'>
            <Icon className='h-5 w-5 text-primary' />
          </div>
        )}
        <div className='min-w-0'>
          <h1 className='text-lg font-semibold truncate'>{text(title)}</h1>
          {description && (
            <p className='text-xs text-muted-foreground truncate'>
              {text(description)}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status + Actions */}
      <div className='flex items-center gap-2 sm:gap-3 shrink-0'>
        {/* Status indicator */}
        <StatusIndicator status={status} label={text(statusLabel)} />

        {/* Search input */}
        {onSearchChange && (
          <div className='relative'>
            <Search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <input
              type='text'
              placeholder={text(searchPlaceholder) || t('common.search')}
              value={searchValue || ''}
              onChange={handleSearchChange}
              className='h-7 w-40 rounded-md border bg-background pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-48'
            />
          </div>
        )}

        {/* Last update timestamp */}
        {formattedLastUpdate && (
          <span className='text-xs text-muted-foreground tabular-nums hidden md:inline'>
            {formattedLastUpdate}
          </span>
        )}

        {/* Auto-refresh toggle */}
        {onAutoRefreshToggle && (
          <Button
            variant={autoRefresh ? 'secondary' : 'ghost'}
            size='sm'
            onClick={handleAutoRefreshToggle}
            className='h-7 px-2 text-xs hidden sm:inline-flex'
            title={
              autoRefresh
                ? t('dashboard.disableAutoRefresh')
                : t('dashboard.enableAutoRefresh')
            }
            data-testid='dashboard-header-auto-refresh-toggle'
          >
            {t('dashboard.auto')}
          </Button>
        )}

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant='outline'
            size='sm'
            onClick={onRefresh}
            disabled={isRefreshing}
            className='h-7 w-7 p-0'
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
            />
          </Button>
        )}

        {/* Edit mode toggle */}
        {onEditToggle && (
          <Button
            variant={editable ? 'default' : 'outline'}
            size='sm'
            onClick={handleEditToggle}
            className={cn('h-7 gap-1.5 px-2.5', editable && 'bg-primary')}
            title={editable ? t('dashboard.saveLayout') : t('dashboard.editLayout')}
            aria-label={editable ? t('dashboard.saveLayout') : t('dashboard.editLayout')}
          >
            {editable ? (
              <>
                <Check className='h-3.5 w-3.5' />
                <span className='hidden sm:inline text-xs'>{t('common.save')}</span>
              </>
            ) : (
              <>
                <Pencil className='h-3.5 w-3.5' />
                <span className='hidden sm:inline text-xs'>{t('common.edit')}</span>
              </>
            )}
          </Button>
        )}

        {/* Fullscreen toggle */}
        {allowFullscreen && onFullscreenToggle && (
          <Button
            variant='outline'
            size='sm'
            onClick={onFullscreenToggle}
            className='h-7 w-7 p-0'
            title={isFullscreen ? t('dashboard.exitFullscreen') : t('dashboard.fullscreen')}
            aria-label={isFullscreen ? t('dashboard.exitFullscreen') : t('dashboard.fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className='h-3.5 w-3.5' />
            ) : (
              <Maximize2 className='h-3.5 w-3.5' />
            )}
          </Button>
        )}

        {/* Custom actions */}
        {actions}
      </div>
    </div>
  )
})
