import type { StateCreator } from 'zustand'
import type { MenuItem } from '../../types/menu'

/**
 * Config Slice - Manages the application's static configuration
 *
 * @example
 * ```tsx
 * const { appName, logoUrl, menuItems } = useAppStore()
 *
 * <img src={logoUrl} alt={appName} />
 * ```
 */

// Types
export interface AppConfig {
  appName: string
  version?: string
  description?: string
  logoUrl?: string
  compactLogoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  menuItems?: MenuItem[]
  [key: string]: unknown // Allows custom configuration entries
}

export interface ConfigSlice {
  // State
  appName: string
  version: string
  description: string
  logoUrl: string
  compactLogoUrl: string
  faviconUrl: string
  primaryColor: string
  menuItems: MenuItem[]
  customConfig: Record<string, unknown>

  // Actions
  setConfig: (config: Partial<AppConfig>) => void
  updateConfig: (config: Partial<AppConfig>) => void
  setMenuItems: (items: MenuItem[]) => void
  setCustomConfig: (key: string, value: unknown) => void
  getCustomConfig: (key: string) => unknown
}

// Default values
const DEFAULT_CONFIG = {
  appName: 'TelamonJS App',
  version: '1.0.0',
  description: 'Admin application powered by TelamonJS',
  logoUrl: '/logo.png',
  compactLogoUrl: '/icon.png',
  faviconUrl: '/favicon.ico',
  primaryColor: '#3b82f6',
  menuItems: [],
  customConfig: {},
}

// Slice creator
export const createConfigSlice: StateCreator<
  ConfigSlice,
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  // Initial state
  ...DEFAULT_CONFIG,

  // Actions
  setConfig: config => {
    const { customConfig: _, ...restConfig } = config

    set({
      ...restConfig,
      customConfig: config.customConfig ? { ...config.customConfig } : {},
    })
  },

  updateConfig: config => {
    const current = get()
    const { customConfig: newCustom, ...restConfig } = config

    set({
      ...restConfig,
      customConfig: newCustom
        ? { ...current.customConfig, ...newCustom }
        : current.customConfig,
    })
  },

  setMenuItems: items => {
    set({ menuItems: items })
  },

  setCustomConfig: (key, value) => {
    const current = get().customConfig
    set({
      customConfig: {
        ...current,
        [key]: value,
      },
    })
  },

  getCustomConfig: key => {
    return get().customConfig[key]
  },
})
