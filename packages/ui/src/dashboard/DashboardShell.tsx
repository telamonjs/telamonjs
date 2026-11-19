'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../utils'
import { DashboardHeader } from './DashboardHeader'
import { DashboardFullscreen } from './DashboardFullscreen'
import { type DashboardShellProps } from '../types/dashboard'

/**
 * DashboardShell - Main container for modern dashboards
 *
 * Features:
 * - Compact header with title, icon and status
 * - Configurable auto-refresh
 * - Fullscreen mode with overlay
 * - Connection status (online/offline/loading/error)
 * - Customizable actions
 * - Two layout modes: fullHeight (maps) or scroll (grids)
 *
 * @example
 * // fullHeight mode (default) - ideal for maps
 * <DashboardShell
 *   title="Meu Estoque"
 *   fullHeight={true}
 * >
 *   <Mapa />
 * </DashboardShell>
 *
 * @example
 * // Scroll mode - ideal for grids with many widgets
 * <DashboardShell
 *   title="Dashboard Executivo"
 *   fullHeight={false}
 * >
 *   <DashboardGrid widgets={widgets} />
 * </DashboardShell>
 */
export function DashboardShell({
  title,
  description,
  icon,
  status = 'online',
  statusLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  autoRefresh: initialAutoRefresh = true,
  autoRefreshInterval = 30000,
  onRefresh,
  lastUpdate: externalLastUpdate,
  allowFullscreen = true,
  fullscreenContent,
  editable,
  onEditToggle,
  actions,
  fullHeight = true,
  className,
  contentClassName,
  children,
}: DashboardShellProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(
    externalLastUpdate || new Date()
  )

  // Keep onRefresh in a ref to avoid interval recreation
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  // Sync external lastUpdate: adjust state during render (not an effect) when
  // the prop changes, per React's "adjusting state when a prop changes"
  // pattern — avoids an extra commit/paint before the value updates.
  const [prevExternalLastUpdate, setPrevExternalLastUpdate] = useState(
    externalLastUpdate
  )
  if (externalLastUpdate && externalLastUpdate !== prevExternalLastUpdate) {
    setPrevExternalLastUpdate(externalLastUpdate)
    setLastUpdate(externalLastUpdate)
  }

  // Auto-refresh interval - executes immediately on mount, then every interval
  useEffect(() => {
    if (!autoRefresh || !onRefreshRef.current) return

    // Execute immediately on first mount
    const executeRefresh = async () => {
      if (!onRefreshRef.current) return
      setIsRefreshing(true)
      try {
        await onRefreshRef.current()
        setLastUpdate(new Date())
      } finally {
        setIsRefreshing(false)
      }
    }

    // Run immediately
    executeRefresh()

    // Then set interval for subsequent refreshes
    const interval = setInterval(executeRefresh, autoRefreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, autoRefreshInterval])

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
      setLastUpdate(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh, isRefreshing])

  const handleAutoRefreshToggle = useCallback((enabled: boolean) => {
    setAutoRefresh(enabled)
  }, [])

  // CSS fullscreen toggle (when fullscreenContent is NOT provided)
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // ESC key to exit CSS fullscreen
  useEffect(() => {
    if (fullscreenContent || !isFullscreen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [fullscreenContent, isFullscreen])

  return (
    <div
      className={cn(
        'dashboard-shell-full flex flex-col',
        fullHeight ? 'h-full' : 'min-h-0',
        isFullscreen &&
          !fullscreenContent &&
          'fixed inset-0 z-50 h-screen bg-background p-4',
        className
      )}
    >
      <DashboardHeader
        title={title}
        description={description}
        icon={icon}
        status={status}
        statusLabel={statusLabel}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        lastUpdate={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh ? handleRefresh : undefined}
        autoRefresh={autoRefresh}
        onAutoRefreshToggle={onRefresh ? handleAutoRefreshToggle : undefined}
        allowFullscreen={allowFullscreen}
        isFullscreen={isFullscreen}
        onFullscreenToggle={
          allowFullscreen ? handleFullscreenToggle : undefined
        }
        editable={editable}
        onEditToggle={onEditToggle}
        actions={actions}
      />

      <div
        className={cn(
          fullHeight ? 'flex-1 min-h-0 overflow-hidden' : 'overflow-visible',
          contentClassName
        )}
      >
        {children}
      </div>

      {allowFullscreen && fullscreenContent && (
        <DashboardFullscreen
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          title={title}
          icon={icon}
          status={status}
          statusLabel={statusLabel}
        >
          {fullscreenContent}
        </DashboardFullscreen>
      )}
    </div>
  )
}
