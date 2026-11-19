'use client'

import { useSyncExternalStore } from 'react'

export type ViewMode = 'table' | 'cards'

const MEDIA_QUERY = '(max-width: 768px)'

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mediaQuery = window.matchMedia(MEDIA_QUERY)
  mediaQuery.addEventListener('change', onStoreChange)
  return () => mediaQuery.removeEventListener('change', onStoreChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(MEDIA_QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Hook that detects mobile and returns the appropriate view mode
 * Mobile (<768px): 'cards'
 * Desktop (>=768px): 'table' (ou defaultMode se fornecido)
 */
export function useResponsiveViewMode(defaultMode?: ViewMode): ViewMode {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Mobile: cards, Desktop: table (or defaultMode)
  return isMobile ? 'cards' : defaultMode || 'table'
}
