'use client'

import * as React from 'react'
import type {
  SystemConfig,
  SystemConfigProviderProps,
  UseSystemConfigReturn,
} from '../types/system-config'

const SystemConfigContext = React.createContext<UseSystemConfigReturn | null>(
  null
)

export function SystemConfigProvider({
  config,
  children,
}: SystemConfigProviderProps) {
  const [currentConfig, setCurrentConfig] = React.useState<SystemConfig>(config)

  const updateConfig = React.useCallback((updates: Partial<SystemConfig>) => {
    setCurrentConfig(prev => ({
      ...prev,
      ...updates,
    }))
  }, [])

  // Performance: useMemo no value para evitar re-renders de todos os consumers
  const value = React.useMemo<UseSystemConfigReturn>(
    () => ({
      config: currentConfig,
      updateConfig,
    }),
    [currentConfig, updateConfig]
  )

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook tied to SystemConfigProvider, colocated by design
export function useSystemConfig(): UseSystemConfigReturn {
  const context = React.useContext(SystemConfigContext)
  if (!context) {
    throw new Error(
      'useSystemConfig must be used within a SystemConfigProvider'
    )
  }
  return context
}
