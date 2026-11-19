'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '../../utils'
import { useTelamonjsT } from '../../i18n/use-t'
import { Button } from '../../ui/button'
import { TooltipProvider } from '../../ui/tooltip'
import { SidebarHeader } from './header'
import { SIDEBAR_PREFERENCE_SCRIPT } from '../../stores/sidebar-preference'
import { SidebarDesktopFooter, type SidebarFooterSession } from './footer'

export interface SidebarDesktopShellProps {
  className?: string
  isCompact: boolean
  /**
   * When true (default), an expanded sidebar is also 64px below `lg` via CSS,
   * so the first paint is right before `useMediaQuery` resolves (no 256 -> 64
   * flicker on tablets). Pass false when the user expanded it while narrow.
   */
  narrowAutoCompact?: boolean
  compactLogoUrl?: string
  logoUrl: string
  systemName: string
  logoClassName?: string
  buildLogoStyles: (isCompact: boolean) => CSSProperties
  resetToHome: () => void
  toggleSidebar: () => void
  canGoBack: boolean
  currentMenuTitle?: string
  handleBackClick: () => void
  renderMenuItems: (overrideCompact?: boolean) => ReactNode
  footerContent?: ReactNode
  session?: SidebarFooterSession
  showUserAvatar: boolean
  showUserRole: boolean
  userInitial: string
  onSignOut?: () => void
  onStopImpersonation?: () => Promise<void>
  isPendingImpersonation: boolean
  handleStopImpersonation: () => void
  localeSwitcher?: boolean
  profileHref?: string
}

/**
 * SidebarDesktopShell - the desktop (md:block) sidebar column: header,
 * collapse button, back-nav, menu items and footer.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
export function SidebarDesktopShell({
  className,
  isCompact,
  narrowAutoCompact = true,
  compactLogoUrl,
  logoUrl,
  systemName,
  logoClassName,
  buildLogoStyles,
  resetToHome,
  toggleSidebar,
  canGoBack,
  currentMenuTitle,
  handleBackClick,
  renderMenuItems,
  footerContent,
  session,
  showUserAvatar,
  showUserRole,
  userInitial,
  onSignOut,
  onStopImpersonation,
  isPendingImpersonation,
  handleStopImpersonation,
  localeSwitcher,
  profileHref,
}: SidebarDesktopShellProps) {
  const t = useTelamonjsT()
  return (
    <>
      {/* Runs while the HTML is parsed (not on client renders), so a stored
        compact preference paints at 64px before hydration. */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SIDEBAR_PREFERENCE_SCRIPT }}
      />
      <aside
        aria-label={t('shell.sidebarNav')}
        className={cn(
          'h-full transition-all duration-300 ease-in-out',
          'hidden md:block',
          isCompact && 'w-16',
          !isCompact && 'w-64',
          !isCompact && narrowAutoCompact && 'max-lg:w-16',
          !isCompact && '[html[data-telamonjs-sidebar=compact]_&]:w-16',
          className
        )}
      >
        <TooltipProvider delayDuration={0}>
          <div
            className={cn(
              'flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
              'transition-all duration-300 ease-in-out',
              isCompact ? 'w-16' : 'w-64',
              !isCompact && narrowAutoCompact && 'max-lg:w-16',
              !isCompact &&
                '[html[data-telamonjs-sidebar=compact]_&]:w-16 [html[data-telamonjs-sidebar=compact]_&]:overflow-hidden'
            )}
          >
            <SidebarHeader
              isCompact={isCompact}
              compactLogoUrl={compactLogoUrl}
              logoUrl={logoUrl}
              systemName={systemName}
              logoClassName={logoClassName}
              buildLogoStyles={buildLogoStyles}
              resetToHome={resetToHome}
              toggleSidebar={toggleSidebar}
            />

            {/* Navigation Header with Back Button */}
            {!isCompact && canGoBack && (
              <div className='border-b border-sidebar-border bg-sidebar-accent/30 p-3'>
                <Button
                  variant='ghost'
                  size='sm'
                  data-testid='sidebar-back-button'
                  onClick={handleBackClick}
                  className='h-10 w-full justify-start gap-3 px-3 transition-all hover:bg-sidebar-accent'
                >
                  <ArrowLeft className='h-4 w-4 shrink-0 text-primary' />
                  <span className='truncate text-sm font-semibold text-sidebar-foreground'>
                    {currentMenuTitle}
                  </span>
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className='flex-1 overflow-hidden'>
              <div className='h-full space-y-1 overflow-y-auto px-3 py-3'>
                {renderMenuItems()}
              </div>
            </div>

            <SidebarDesktopFooter
              isCompact={isCompact}
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
          </div>
        </TooltipProvider>
      </aside>
    </>
  )
}
