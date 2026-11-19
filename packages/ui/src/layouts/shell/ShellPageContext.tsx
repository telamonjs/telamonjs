'use client'

import { createContext, useContext } from 'react'

export interface ShellPageContextValue {
  isFullscreen: boolean
  toggleFullscreen: () => void
}

export const ShellPageContext = createContext<ShellPageContextValue | null>(null)

/**
 * Access ShellPage context (fullscreen state).
 * Returns null when used outside of ShellPage.
 */
export function useShellPage(): ShellPageContextValue | null {
  return useContext(ShellPageContext)
}
