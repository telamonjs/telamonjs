'use client'

import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { useMediaQuery } from '../hooks/use-mobile'
import { useTelamonjsT, useText } from '../i18n/use-t'
import {
  useSidebarState,
  useIsMobileOpen,
  useSidebarActions,
} from '../stores/sidebar-store'
import { useMenuStack, useMenuActions } from '../stores/menu-store'
import type { GroupMenuItem, MenuItem } from '../types/menu'
import { useStopImpersonation } from '../components/impersonation/use-stop-impersonation'
import { MenuItemComponent } from './modern-sidebar/menu-item'
import { MenuSectionComponent } from './modern-sidebar/menu-section'
import { SidebarDesktopShell } from './modern-sidebar/desktop-shell'
import {
  SidebarMobileTrigger,
  SidebarMobileDrawer,
} from './modern-sidebar/mobile-shell'

export interface ModernSidebarProps {
  className?: string
  menuConfig?: MenuItem[]
  session?: {
    user?: {
      name?: string
      email?: string
      role?: {
        name?: string
      }
    }
    isImpersonating?: boolean
    originalUser?: {
      name?: string
    }
  }
  logoUrl?: string
  compactLogoUrl?: string
  /** Classes CSS para o logo */
  logoClassName?: string
  /** Inline styles for the logo */
  logoStyle?: CSSProperties
  /** Logo height */
  logoHeight?: number | string
  /** Logo max width */
  logoMaxWidth?: number | string
  /** Logo height when sidebar is collapsed (falls back to logoHeight) */
  compactLogoHeight?: number | string
  /** Logo max width when sidebar is collapsed (falls back to logoMaxWidth) */
  compactLogoMaxWidth?: number | string
  systemName?: string
  onSignOut?: () => void
  /** Callback to stop impersonation */
  onStopImpersonation?: () => Promise<void>
  /** Mobile trigger position */
  mobileTriggerPosition?: 'top-left' | 'bottom-right'
  /** Show user avatar */
  showUserAvatar?: boolean
  /** Show user role */
  showUserRole?: boolean
  /** Custom footer content (below the user info) */
  footerContent?: ReactNode
  /** Shows the language item in the user menu when >1 locale is configured. Default: true. */
  localeSwitcher?: boolean
  /** Profile route for the user menu's "Profile" item (disabled without it). */
  profileHref?: string
}

// Main Sidebar Component
export function ModernSidebar({
  className,
  menuConfig = [],
  session,
  logoUrl = '/logo.png',
  compactLogoUrl,
  logoClassName,
  logoStyle,
  logoHeight,
  logoMaxWidth,
  compactLogoHeight,
  compactLogoMaxWidth,
  systemName,
  onSignOut,
  onStopImpersonation,
  mobileTriggerPosition = 'top-left',
  showUserAvatar = true,
  showUserRole = true,
  footerContent,
  localeSwitcher = true,
  profileHref,
}: ModernSidebarProps) {
  const t = useTelamonjsT()
  const text = useText()
  const effectiveSystemName = systemName ?? t('shell.systemName')
  const pathname = usePathname()

  // Sidebar state
  const sidebarState = useSidebarState()
  const isMobileOpen = useIsMobileOpen()
  const menuStack = useMenuStack()
  const { toggleSidebar: toggleStoreSidebar, setMobileOpen } =
    useSidebarActions()

  // Auto-compact between md (768) and lg (1024): an expanded 256px column
  // leaves too little room for data tables there. The persisted store
  // preference is NOT touched, so it is restored as soon as the viewport is
  // >= lg again; the collapse button toggles a local override while narrow.
  const isNarrow = useMediaQuery('(max-width: 1023px)')
  const [narrowExpanded, setNarrowExpanded] = useState(false)
  // Reset the local override when the narrow breakpoint changes, computed
  // during render (not an effect) per React's "adjusting state when a prop
  // changes" pattern.
  const [prevIsNarrow, setPrevIsNarrow] = useState(isNarrow)
  if (isNarrow !== prevIsNarrow) {
    setPrevIsNarrow(isNarrow)
    setNarrowExpanded(false)
  }
  const toggleSidebar = useCallback(() => {
    if (isNarrow) setNarrowExpanded(v => !v)
    else toggleStoreSidebar()
  }, [isNarrow, toggleStoreSidebar])
  const { handleSectionClick, handleBackClick } = useMenuActions()

  // Impersonation state (loading/toast/log compartilhados com o AdminShell)
  const { isPending: isPendingImpersonation, stop: handleStopImpersonation } =
    useStopImpersonation(onStopImpersonation, 'ModernSidebar')

  // Build logo styles
  const buildLogoStyles = useCallback(
    (isCompact: boolean): CSSProperties => {
      const styles: CSSProperties = { ...logoStyle }

      const effectiveHeight =
        isCompact && compactLogoHeight !== undefined
          ? compactLogoHeight
          : logoHeight
      const effectiveMaxWidth =
        isCompact && compactLogoMaxWidth !== undefined
          ? compactLogoMaxWidth
          : logoMaxWidth

      // Apply height if provided
      if (effectiveHeight !== undefined) {
        styles.height =
          typeof effectiveHeight === 'number'
            ? `${effectiveHeight}px`
            : effectiveHeight
      } else {
        // Default heights
        styles.height = isCompact ? '32px' : '40px'
      }

      // Apply maxWidth if provided
      if (effectiveMaxWidth !== undefined) {
        styles.maxWidth =
          typeof effectiveMaxWidth === 'number'
            ? `${effectiveMaxWidth}px`
            : effectiveMaxWidth
      }

      // Always set width auto for aspect ratio preservation
      styles.width = 'auto'

      return styles
    },
    [
      logoStyle,
      logoHeight,
      logoMaxWidth,
      compactLogoHeight,
      compactLogoMaxWidth,
    ]
  )

  // Collect all single item hrefs from current menu for best match detection
  const allSingleItemHrefs = useMemo(() => {
    const hrefs: string[] = []
    const collectHrefs = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.type === 'single' && item.href) {
          hrefs.push(item.href)
        } else if (item.type === 'group' && item.children) {
          collectHrefs(item.children)
        }
      }
    }
    collectHrefs(menuStack[menuStack.length - 1]?.items || menuConfig)
    return hrefs
  }, [menuStack, menuConfig])

  // Find the best matching href (longest match wins)
  const bestMatchHref = useMemo(() => {
    const matches = allSingleItemHrefs.filter(
      href => pathname === href || pathname.startsWith(href + '/')
    )
    if (matches.length === 0) return null
    return matches.reduce((best, current) =>
      current.length > best.length ? current : best
    )
  }, [pathname, allSingleItemHrefs])

  // Check if a single item is active (only the best match)
  const isItemActive = useCallback(
    (href: string) => {
      if (href === '/admin') return pathname === '/admin'
      return href === bestMatchHref
    },
    [pathname, bestMatchHref]
  )

  // Check if section is active
  const isActiveSection = useCallback(
    (section: GroupMenuItem) => {
      if (section.href && pathname.startsWith(section.href)) {
        return true
      }
      return section.children.some(
        child => child.type === 'single' && pathname.startsWith(child.href)
      )
    },
    [pathname]
  )

  const currentMenu = useMemo(() => {
    return (
      menuStack[menuStack.length - 1] || {
        level: 'sections' as const,
        title: t('shell.home'),
        items: menuConfig,
      }
    )
  }, [menuStack, menuConfig, t])

  const canGoBack = menuStack.length > 0

  const handleNavigate = useCallback(() => {
    setMobileOpen(false)
  }, [setMobileOpen])

  const resetToHome = useCallback(() => {
    // Reset menu stack via store
  }, [])

  const isCompact = isNarrow ? !narrowExpanded : sidebarState === 'compact'
  const isHidden = sidebarState === 'hidden'

  // Render menu items (compact can be overridden for mobile drawer)
  const renderMenuItems = useCallback(
    (overrideCompact?: boolean) => {
      if (!currentMenu) return null

      const compact = overrideCompact ?? isCompact

      return currentMenu.items.map(item => {
        if (item.type === 'separator') {
          return (
            <div
              key={item.id}
              className={
                compact
                  ? 'my-2 border-t border-border'
                  : 'my-2 mx-3 border-t border-border'
              }
            />
          )
        }

        if (item.type === 'single') {
          return (
            <MenuItemComponent
              key={item.id}
              item={item}
              isActive={isItemActive(item.href)}
              isCompact={compact}
              onNavigate={handleNavigate}
            />
          )
        }

        if (item.type === 'group') {
          return (
            <MenuSectionComponent
              key={item.id}
              item={item}
              isActive={isActiveSection(item)}
              isCompact={compact}
              onSectionClick={handleSectionClick}
            />
          )
        }

        return null
      })
    },
    [
      currentMenu,
      isCompact,
      isItemActive,
      isActiveSection,
      handleNavigate,
      handleSectionClick,
    ]
  )

  // User avatar initial
  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || 'U'

  // Don't render if hidden
  if (isHidden) return null

  return (
    <>
      <SidebarMobileTrigger
        mobileTriggerPosition={mobileTriggerPosition}
        setMobileOpen={setMobileOpen}
      />

      <SidebarDesktopShell
        className={className}
        isCompact={isCompact}
        narrowAutoCompact={!narrowExpanded}
        compactLogoUrl={compactLogoUrl}
        logoUrl={logoUrl}
        systemName={effectiveSystemName}
        logoClassName={logoClassName}
        buildLogoStyles={buildLogoStyles}
        resetToHome={resetToHome}
        toggleSidebar={toggleSidebar}
        canGoBack={canGoBack}
        currentMenuTitle={text(currentMenu?.title)}
        handleBackClick={handleBackClick}
        renderMenuItems={renderMenuItems}
        footerContent={footerContent}
        session={session}
        showUserAvatar={showUserAvatar}
        showUserRole={showUserRole}
        userInitial={userInitial}
        onSignOut={onSignOut}
        onStopImpersonation={onStopImpersonation}
        isPendingImpersonation={isPendingImpersonation}
        handleStopImpersonation={handleStopImpersonation}
        localeSwitcher={localeSwitcher}
        profileHref={profileHref}
      />

      <SidebarMobileDrawer
        isMobileOpen={isMobileOpen}
        setMobileOpen={setMobileOpen}
        resetToHome={resetToHome}
        logoUrl={logoUrl}
        systemName={effectiveSystemName}
        logoClassName={logoClassName}
        buildLogoStyles={buildLogoStyles}
        canGoBack={canGoBack}
        currentMenuTitle={text(currentMenu?.title)}
        handleBackClick={handleBackClick}
        renderMenuItems={renderMenuItems}
        footerContent={footerContent}
        session={session}
        showUserAvatar={showUserAvatar}
        showUserRole={showUserRole}
        userInitial={userInitial}
        onSignOut={onSignOut}
        onStopImpersonation={onStopImpersonation}
        isPendingImpersonation={isPendingImpersonation}
        handleStopImpersonation={handleStopImpersonation}
        localeSwitcher={localeSwitcher}
        profileHref={profileHref}
      />
    </>
  )
}
