import { ReactNode } from 'react'
import type { IconComponent } from './menu'
import type { I18nText } from '../i18n/msg'

// Status types
export type DashboardStatus = 'online' | 'offline' | 'loading' | 'error'



// Component props
export interface DashboardShellProps {
  title: I18nText
  description?: I18nText
  /**
   * Header icon. Accepts a string key resolved via `getIcon()` (preferred in link-mode
   * to avoid dual-instance TS errors) or a direct icon component.
   */
  icon?: string | IconComponent
  status?: DashboardStatus
  statusLabel?: I18nText
  searchPlaceholder?: I18nText
  searchValue?: string
  onSearchChange?: (value: string) => void
  autoRefresh?: boolean
  autoRefreshInterval?: number
  onRefresh?: () => void | Promise<void>
  lastUpdate?: Date
  allowFullscreen?: boolean
  fullscreenContent?: ReactNode
  editable?: boolean
  onEditToggle?: (enabled: boolean) => void
  actions?: ReactNode
  fullHeight?: boolean
  /** Negate parent padding with negative margins (use when Shell is inside a padded container) */
  flush?: boolean
  className?: string
  contentClassName?: string
  children: ReactNode
}

export interface DashboardHeaderProps {
  title: I18nText
  description?: I18nText
  /** Icon as string key (via `getIcon()`) or direct component. */
  icon?: string | IconComponent
  status?: DashboardStatus
  statusLabel?: I18nText
  searchPlaceholder?: I18nText
  searchValue?: string
  onSearchChange?: (value: string) => void
  lastUpdate?: Date
  isRefreshing?: boolean
  onRefresh?: () => void
  autoRefresh?: boolean
  onAutoRefreshToggle?: (enabled: boolean) => void
  allowFullscreen?: boolean
  isFullscreen?: boolean
  onFullscreenToggle?: () => void
  editable?: boolean
  onEditToggle?: (enabled: boolean) => void
  actions?: ReactNode
  className?: string
}



export interface DashboardFullscreenProps {
  isOpen: boolean
  onClose: () => void
  title: I18nText
  /** Icon as string key (via `getIcon()`) or direct component. */
  icon?: string | IconComponent
  status?: DashboardStatus
  statusLabel?: I18nText
  children: ReactNode
}
