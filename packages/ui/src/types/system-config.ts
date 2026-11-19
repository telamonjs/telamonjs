import { MenuItem } from './menu'

export interface SystemIdentity {
  name: string
  description: string
  version: string
  logo?: string
  favicon?: string
}

export interface SystemLayout {
  defaultSidebarState: 'expanded' | 'compact' | 'hidden'
  showBreadcrumb: boolean
  showSearch: boolean
  showNotifications: boolean
  maxContentWidth?: string
}

export interface SystemMenu {
  items: MenuItem[]
  showIcons: boolean
  showBadges: boolean
  allowCollapse: boolean
}

export interface SystemTheme {
  primaryColor: string
  mode: 'light' | 'dark' | 'system'
  customCSS?: string
}

export interface SystemAuth {
  enabled: boolean
  redirectPath: string
  sessionProvider: 'nextauth' | 'custom'
  // TODO: roles should be defined in the consuming application
  // roles?: string[]
}

export interface SystemLinks {
  home: string
  support?: string
  documentation?: string
  github?: string
}

export interface SystemConfig {
  identity: SystemIdentity
  layout: SystemLayout
  menu: SystemMenu
  theme: SystemTheme
  auth: SystemAuth
  links: SystemLinks
}

// Provider props
export interface SystemConfigProviderProps {
  config: SystemConfig
  children: React.ReactNode
}

// Hook return type
export interface UseSystemConfigReturn {
  config: SystemConfig
  updateConfig: (updates: Partial<SystemConfig>) => void
}
