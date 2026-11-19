'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, LogOut, User } from 'lucide-react'
import { cn } from '../../utils'
import { useTelamonjsT } from '../../i18n/use-t'
import { useTelamonjsI18n } from '../../i18n/context'
import { LocaleSwitcher } from '../../i18n/LocaleSwitcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'

export interface SidebarFooterSession {
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

interface SidebarFooterCommonProps {
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
  /** Route of the user's profile page; without it the "Profile" item stays disabled. */
  profileHref?: string
}

/**
 * ImpersonationMenuItem - shared "Voltar ao Original" dropdown entry.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
function ImpersonationMenuItem({
  isPendingImpersonation,
  handleStopImpersonation,
}: {
  isPendingImpersonation: boolean
  handleStopImpersonation: () => void
}) {
  const t = useTelamonjsT()
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={event => {
          // Keep the menu open so the "reverting" state stays visible
          event.preventDefault()
          void handleStopImpersonation()
        }}
        disabled={isPendingImpersonation}
        className='cursor-pointer text-warning-foreground focus:bg-warning/20 focus:text-warning-foreground outline-none ring-0'
      >
        {isPendingImpersonation ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <ArrowLeft className='mr-2 h-4 w-4' />
        )}
        <span>{isPendingImpersonation ? t('shell.reverting') : t('shell.revertToOriginal')}</span>
      </DropdownMenuItem>
    </>
  )
}

/**
 * SidebarDesktopFooter - custom footer slot + user info/impersonation/signout
 * dropdown for the desktop sidebar column.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
/** "Profile" item: a link when the app has a profile route, disabled otherwise. */
function ProfileMenuItem({
  profileHref,
  label,
  onNavigate,
}: {
  profileHref?: string
  label: string
  onNavigate?: () => void
}) {
  if (!profileHref) {
    return (
      <DropdownMenuItem disabled className='cursor-not-allowed outline-none ring-0'>
        <User className='mr-2 h-4 w-4' />
        <span>{label}</span>
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenuItem asChild className='cursor-pointer outline-none ring-0'>
      <Link href={profileHref} onClick={onNavigate} data-testid='sidebar-profile-link'>
        <User className='mr-2 h-4 w-4' />
        <span>{label}</span>
      </Link>
    </DropdownMenuItem>
  )
}

export function SidebarDesktopFooter({
  isCompact,
  footerContent,
  session,
  showUserAvatar,
  showUserRole,
  userInitial,
  onSignOut,
  onStopImpersonation,
  isPendingImpersonation,
  handleStopImpersonation,
  localeSwitcher = true,
  profileHref,
}: SidebarFooterCommonProps & { isCompact: boolean }) {
  const t = useTelamonjsT()
  const { locales } = useTelamonjsI18n()
  return (
    <>
      {/* Custom Footer Content - Transparent background (same as menu area) */}
      {footerContent && !isCompact && (
        <div className='px-3 pb-3'>{footerContent}</div>
      )}

      {/* User Info Footer - Different background */}
      <div
        className={cn(
          'border-t border-sidebar-border p-3',
          'bg-[hsl(var(--sidebar-footer-bg,var(--sidebar-background)))]',
          isCompact && 'px-2'
        )}
      >
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid='sidebar-user-menu-trigger'
                className={cn(
                  'flex items-center gap-2 rounded-md transition-colors hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                  !isCompact && 'w-full'
                )}
              >
                {!isCompact ? (
                  <>
                    {showUserAvatar && (
                      <div className='flex h-9 w-9 items-center justify-center rounded-full bg-primary'>
                        <span className='text-sm font-semibold text-primary-foreground'>
                          {userInitial}
                        </span>
                      </div>
                    )}
                    <div className='min-w-0 flex-1 text-left'>
                      <div className='truncate text-sm font-semibold text-sidebar-foreground'>
                        {session.user.name}
                      </div>
                      {showUserRole && session.user.role?.name ? (
                        <div className='truncate text-xs text-sidebar-foreground opacity-70'>
                          {session.user.role.name}
                        </div>
                      ) : (
                        <div className='truncate text-xs text-sidebar-foreground opacity-70'>
                          {session.user.email}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className='flex h-9 w-full items-center justify-center'>
                    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-primary'>
                      <span className='text-sm font-semibold text-primary-foreground'>
                        {userInitial}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              side='top'
              className='w-56 border-sidebar-border outline-none ring-0'
            >
              <ProfileMenuItem profileHref={profileHref} label={t('shell.profile')} />
              {session.isImpersonating && onStopImpersonation && (
                <ImpersonationMenuItem
                  isPendingImpersonation={isPendingImpersonation}
                  handleStopImpersonation={handleStopImpersonation}
                />
              )}
              {localeSwitcher && locales.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className='text-xs font-normal text-sidebar-foreground opacity-70'>
                    {t('shell.language')}
                  </DropdownMenuLabel>
                  <LocaleSwitcher variant='menu' />
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className='cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive outline-none ring-0'
              >
                <LogOut className='mr-2 h-4 w-4' />
                <span>{t('shell.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  )
}

/**
 * SidebarMobileFooter - custom footer slot + user info/impersonation/signout
 * dropdown for the mobile drawer.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
export function SidebarMobileFooter({
  footerContent,
  session,
  showUserAvatar,
  showUserRole,
  userInitial,
  onSignOut,
  onStopImpersonation,
  isPendingImpersonation,
  handleStopImpersonation,
  setMobileOpen,
  localeSwitcher = true,
  profileHref,
}: SidebarFooterCommonProps & { setMobileOpen: (open: boolean) => void }) {
  const t = useTelamonjsT()
  const { locales } = useTelamonjsI18n()
  return (
    <>
      {/* Custom Footer Content - Mobile Transparent background */}
      {footerContent && <div className='mt-auto px-3 pb-3'>{footerContent}</div>}

      {/* Footer mobile - User Info */}
      {session?.user && (
        <div
          className={cn(
            'border-t border-sidebar-border bg-[hsl(var(--sidebar-footer-bg,var(--sidebar-background)))] p-3',
            !footerContent && 'mt-auto'
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid='sidebar-mobile-user-menu-trigger'
                className='flex w-full items-center gap-3 rounded-md transition-colors hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
              >
                {showUserAvatar && (
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                    <span className='text-base font-semibold'>
                      {userInitial}
                    </span>
                  </div>
                )}
                <div className='min-w-0 flex-1 text-left'>
                  <div className='truncate text-sm font-semibold text-sidebar-foreground'>
                    {session.user.name}
                  </div>
                  {showUserRole && session.user.role?.name ? (
                    <div className='truncate text-xs text-sidebar-foreground opacity-70'>
                      {session.user.role.name}
                    </div>
                  ) : (
                    <div className='truncate text-xs text-sidebar-foreground opacity-70'>
                      {session.user.email}
                    </div>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              side='top'
              className='w-56 border-sidebar-border outline-none ring-0'
            >
              <ProfileMenuItem
                profileHref={profileHref}
                label={t('shell.profile')}
                onNavigate={() => setMobileOpen(false)}
              />
              {session.isImpersonating && onStopImpersonation && (
                <ImpersonationMenuItem
                  isPendingImpersonation={isPendingImpersonation}
                  handleStopImpersonation={handleStopImpersonation}
                />
              )}
              {localeSwitcher && locales.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className='text-xs font-normal text-sidebar-foreground opacity-70'>
                    {t('shell.language')}
                  </DropdownMenuLabel>
                  <LocaleSwitcher variant='menu' />
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setMobileOpen(false)
                  onSignOut?.()
                }}
                className='cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive outline-none ring-0'
              >
                <LogOut className='mr-2 h-4 w-4' />
                <span>{t('shell.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  )
}
