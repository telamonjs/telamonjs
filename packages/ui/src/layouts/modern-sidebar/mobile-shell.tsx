'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { usePresence } from '../../hooks/use-presence'
import { ArrowLeft, Menu, X } from 'lucide-react'
import { cn } from '../../utils'
import { Button } from '../../ui/button'
import { TooltipProvider } from '../../ui/tooltip'
import { useTelamonjsT } from '../../i18n/use-t'
import { mobileSidebarStyle } from './animations'
import { SidebarMobileFooter, type SidebarFooterSession } from './footer'

export interface SidebarMobileTriggerProps {
  mobileTriggerPosition: 'top-left' | 'bottom-right'
  setMobileOpen: (open: boolean) => void
}

/**
 * SidebarMobileTrigger - the floating button (md:hidden) that opens the
 * mobile drawer.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
export function SidebarMobileTrigger({
  mobileTriggerPosition,
  setMobileOpen,
}: SidebarMobileTriggerProps) {
  const t = useTelamonjsT()
  return (
    <Button
      variant='outline'
      size='icon'
      className={cn(
        'fixed z-50 border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg backdrop-blur-sm hover:bg-sidebar-accent md:hidden',
        mobileTriggerPosition === 'top-left' && 'left-4 top-4',
        mobileTriggerPosition === 'bottom-right' &&
          'bottom-4 right-4 h-12 w-12 rounded-full'
      )}
      onClick={() => setMobileOpen(true)}
      aria-label={t('shell.openMenu')}
    >
      <Menu
        className={cn(
          mobileTriggerPosition === 'bottom-right' ? 'h-6 w-6' : 'h-5 w-5'
        )}
      />
    </Button>
  )
}

export interface SidebarMobileDrawerProps {
  isMobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  resetToHome: () => void
  logoUrl: string
  systemName: string
  logoClassName?: string
  buildLogoStyles: (isCompact: boolean) => CSSProperties
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
 * SidebarMobileDrawer - the AnimatePresence overlay + sliding drawer,
 * with its own header/back-nav/nav-items/footer.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
export function SidebarMobileDrawer({
  isMobileOpen,
  setMobileOpen,
  resetToHome,
  logoUrl,
  systemName,
  logoClassName,
  buildLogoStyles,
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
}: SidebarMobileDrawerProps) {
  const t = useTelamonjsT()
  const { mounted, state } = usePresence(isMobileOpen, 300)
  return (
    <>
      {mounted && (
        <>
          <div
            data-state={state}
            className='fixed inset-0 z-40 bg-black/50 md:hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300 motion-reduce:animate-none'
            onClick={() => setMobileOpen(false)}
          />
          <aside
            aria-label={t('shell.sidebarNav')}
            data-state={state}
            className='fixed left-0 top-0 z-50 h-full shadow-2xl md:hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-300 ease-in-out motion-reduce:animate-none'
            style={mobileSidebarStyle}
          >
            <div className='relative h-full border-r border-sidebar-border bg-sidebar'>
              <TooltipProvider delayDuration={0}>
                <div className='flex h-full flex-col'>
                  {/* Header mobile */}
                  <div className='sticky top-0 flex h-16 items-center justify-between border-b border-sidebar-border bg-[hsl(var(--sidebar-header-bg,var(--sidebar-background)))] px-4 shadow-sm'>
                    <Link
                      href='/admin'
                      onClick={() => {
                        resetToHome()
                        setMobileOpen(false)
                      }}
                      className='flex items-center gap-2 transition-opacity hover:opacity-80'
                    >
                      <img
                        src={logoUrl}
                        alt={systemName}
                        className={cn('h-12 w-auto', logoClassName)}
                        style={buildLogoStyles(false)}
                      />
                    </Link>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={t('shell.closeMenu')}
                      className='h-8 w-8 rounded-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary'
                      onClick={() => setMobileOpen(false)}
                    >
                      <X className='h-5 w-5' />
                    </Button>
                  </div>

                  {/* Navigation Header with Back Button */}
                  {canGoBack && (
                    <div className='flex items-center gap-3 border-b border-sidebar-border bg-sidebar-accent/30 p-3 backdrop-blur-sm'>
                      <Button
                        variant='ghost'
                        size='sm'
                        aria-label={t('common.back')}
                        onClick={handleBackClick}
                        className='h-8 gap-2 px-2 transition-all hover:bg-sidebar-accent'
                      >
                        <ArrowLeft className='h-4 w-4 text-primary' />
                      </Button>
                      <span className='truncate text-sm font-semibold text-sidebar-foreground'>
                        {currentMenuTitle}
                      </span>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className='min-h-0 flex-1 overflow-hidden'>
                    <div className='h-full space-y-1 overflow-y-auto px-3 py-4'>
                      {renderMenuItems(false)}
                    </div>
                  </div>

                  <SidebarMobileFooter
                    footerContent={footerContent}
                    session={session}
                    showUserAvatar={showUserAvatar}
                    showUserRole={showUserRole}
                    userInitial={userInitial}
                    onSignOut={onSignOut}
                    onStopImpersonation={onStopImpersonation}
                    isPendingImpersonation={isPendingImpersonation}
                    handleStopImpersonation={handleStopImpersonation}
                    setMobileOpen={setMobileOpen}
                    localeSwitcher={localeSwitcher}
                    profileHref={profileHref}
                  />
                </div>
              </TooltipProvider>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
