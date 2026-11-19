'use client'

import type { ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '../../utils'
import { Button } from '../../ui/button'
import { StatusIndicator } from '../../dashboard/StatusIndicator'
import { type DashboardStatus } from '../../types/dashboard'
import { useShellPage } from './ShellPageContext'
import type { IconComponent } from '../../types/menu'
import { getIcon } from '../../utils/icon'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

export interface AdminHeaderProps {
  /** Literal or `msg()` (I18nText) */
  title: I18nText
  /** Literal or `msg()` (I18nText) */
  description?: I18nText
  /**
   * Header icon. Accepts a string key resolved via `getIcon()` (preferred in link-mode
   * to avoid dual-instance TS errors) or a direct icon component.
   */
  icon?: string | IconComponent
  status?: DashboardStatus
  statusLabel?: I18nText
  actions?: ReactNode
  /** Enable fullscreen button (default: true). Only shown when inside ShellPage or when manual overrides provided. */
  allowFullscreen?: boolean
  /** Manual override — use when AdminHeader is outside ShellPage */
  isFullscreen?: boolean
  /** Manual override — use when AdminHeader is outside ShellPage */
  onFullscreenToggle?: () => void
  className?: string
}

/**
 * Resolves and renders the header icon (string key or direct component).
 * Plain function (not a component) so react-compiler doesn't treat the
 * locally-resolved icon as a JSX element type created during render.
 */
function renderAdminHeaderIcon(
  icon: string | IconComponent | undefined,
  className: string
) {
  if (!icon) return null
  const Icon = typeof icon === 'string' ? getIcon(icon) : icon
  return <Icon className={className} />
}

/**
 * AdminHeader — Pure header bar with icon, title, description, status, actions, and fullscreen toggle.
 *
 * Consumes ShellPage context automatically. Falls back to manual props when used standalone.
 *
 * @example
 * ```tsx
 * <AdminHeader title="Central de Alertas" description="Gerencie regras..." icon={Bell} />
 * ```
 */
export function AdminHeader({
  title,
  description,
  icon,
  status,
  statusLabel,
  actions,
  allowFullscreen = true,
  isFullscreen: isFullscreenProp,
  onFullscreenToggle: onFullscreenToggleProp,
  className,
}: AdminHeaderProps) {
  const t = useTelamonjsT()
  const text = useText()
  const shell = useShellPage()

  const isFullscreen = isFullscreenProp ?? shell?.isFullscreen ?? false
  const onToggle = onFullscreenToggleProp ?? shell?.toggleFullscreen
  const showFullscreen = allowFullscreen && !!onToggle

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm shrink-0',
        className
      )}
    >
      <div className='flex items-center gap-2.5 min-w-0'>
        {icon && (
          <div className='p-2 rounded-lg bg-primary/10 shrink-0'>
            {renderAdminHeaderIcon(icon, 'h-5 w-5 text-primary')}
          </div>
        )}
        <div className='min-w-0'>
          <h1 className='text-lg font-semibold truncate leading-tight'>
            {text(title)}
          </h1>
          {description && (
            <p className='text-xs text-muted-foreground truncate'>
              {text(description)}
            </p>
          )}
        </div>
      </div>
      <div className='flex items-center gap-2 shrink-0'>
        {status && <StatusIndicator status={status} label={statusLabel} />}
        {actions}
        {showFullscreen && (
          <Button
            variant='outline'
            size='sm'
            onClick={onToggle}
            className='h-7 w-7 p-0'
            title={isFullscreen ? t('shell.exitFullscreenHint') : t('shell.fullscreen')}
            aria-label={isFullscreen ? t('shell.exitFullscreen') : t('shell.fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className='h-3.5 w-3.5' />
            ) : (
              <Maximize2 className='h-3.5 w-3.5' />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
