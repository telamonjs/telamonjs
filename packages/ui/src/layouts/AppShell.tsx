'use client'

import { ReactNode } from 'react'
import { useSidebarState } from '../stores/sidebar-store'
import { cn } from '../utils'

export interface AppShellProps {
  /**
   * Main content
   */
  children: ReactNode

  /**
   * Sidebar content (desktop)
   */
  sidebar?: ReactNode

  /**
   * Top navigation bar
   */
  topbar?: ReactNode

  /**
   * Bottom navigation (mobile)
   */
  bottomNav?: ReactNode

  /**
   * Layout variant
   * - sidebar: Classic sidebar layout (default)
   * - topnav: Top navigation only
   * - hybrid: Both sidebar (desktop) and topnav
   */
  variant?: 'sidebar' | 'topnav' | 'hybrid'

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * AppShell - Modern responsive app shell component
 *
 * Provides flexible layouts with sidebar, topbar, and bottom navigation.
 * Automatically adapts to mobile/desktop with responsive behavior.
 *
 * @example
 * ```tsx
 * <AppShell
 *   variant="sidebar"
 *   sidebar={<MySidebar />}
 *   topbar={<MyTopbar />}
 *   bottomNav={<MyBottomNav />}
 * >
 *   <MainContent />
 * </AppShell>
 * ```
 */
export function AppShell({
  children,
  sidebar,
  topbar,
  bottomNav,
  variant = 'sidebar',
  className,
}: AppShellProps) {
  const sidebarState = useSidebarState()

  // Determine if we should show desktop sidebar
  const showDesktopSidebar = variant !== 'topnav' && sidebar

  // Determine if we should show topbar
  const showTopbar = variant === 'topnav' || variant === 'hybrid' || topbar

  return (
    <div className={cn('app-shell min-h-screen flex flex-col', className)}>
      {/* Top Navigation (if enabled) */}
      {showTopbar && topbar && (
        <header className='app-shell-topbar sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
          {topbar}
        </header>
      )}

      <div className='app-shell-body flex flex-1'>
        {/* Desktop Sidebar */}
        {showDesktopSidebar && (
          <aside
            className={cn(
              'app-shell-sidebar hidden lg:block border-r bg-background transition-all duration-300',
              {
                'w-64': sidebarState === 'expanded',
                'w-16': sidebarState === 'compact',
                'w-0 border-none': sidebarState === 'hidden',
              }
            )}
          >
            <div className='sticky top-0 h-screen overflow-y-auto'>
              {sidebar}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className='app-shell-main flex-1 overflow-x-hidden pb-16 lg:pb-0'>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {bottomNav && (
        <nav className='app-shell-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden'>
          {bottomNav}
        </nav>
      )}
    </div>
  )
}
