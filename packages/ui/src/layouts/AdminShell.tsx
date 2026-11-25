'use client'

import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { useTelamonjsT, useText } from '../i18n/use-t'
import { ModernSidebar } from './ModernSidebar'
import type { ModernSidebarProps } from './ModernSidebar'
import type { CommandPaletteItem } from '../navigation/CommandPalette'

// cmdk is only needed once the palette is first opened (Cmd/Ctrl+K)
const CommandPalette = lazy(() =>
  import('../navigation/CommandPalette').then(m => ({
    default: m.CommandPalette,
  }))
)
import { ResponsiveBreadcrumb } from '../navigation/Breadcrumb'
import type { BreadcrumbCustomSegments } from '../navigation/Breadcrumb'
import { ImpersonationBanner } from '../components/impersonation/ImpersonationBanner'
import { useStopImpersonation } from '../components/impersonation/use-stop-impersonation'
import { cn } from '../utils'
import { filterMenuByPermission } from '../utils/menu-helpers'
import { usePermissionChecker } from '../providers/PermissionsProvider'
import { getIcon } from '../utils/icon'
import type {
  MenuItem,
  SingleMenuItem,
  GroupMenuItem,
  IconComponent,
} from '../types/menu'

// ─── Public Types ────────────────────────────────────────────────────────────

export interface AdminShellBreadcrumbProps {
  /** Entity name override (e.g. "Asset #123") for detail pages */
  entityName?: string
  /** Overrides keyed by full path (`/admin/configuracoes`) or by segment (`configuracoes`):
   * a label, or `{ label, href }` to link a segment that is not a menu route. */
  customSegments?: BreadcrumbCustomSegments
}

export interface AdminShellProps {
  // ── Layout ──────────────────────────────────────────────────────────────
  children: React.ReactNode
  className?: string
  /** Extra CSS classes applied to the scrollable <main> content area */
  contentClassName?: string

  // ── Menu & Navigation ───────────────────────────────────────────────────
  /** Menu tree passed to ModernSidebar, breadcrumb and CommandPalette (filtered by `can` when set) */
  menuConfig: MenuItem[]
  /**
   * Permission checker for `MenuItem.permission` (any of them grants). When set,
   * the sidebar and the command palette show only the items it grants (see
   * `filterMenuByPermission`); the breadcrumb still labels routes from the full
   * menu, since a page may be reached by link. Without it, the `can` of a
   * `PermissionsProvider` above the shell filters instead; without either every
   * item shows.
   *
   * @example
   * ```tsx
   * // with @telamonjs/permissions
   * <AdminShell menuConfig={menuConfig} can={perm => checker.can(session.user, perm)}>
   * ```
   */
  can?: (permission: string) => boolean

  // ── Sidebar passthrough ─────────────────────────────────────────────────
  /** Session data forwarded to ModernSidebar (user name/email/role, impersonation) */
  session?: ModernSidebarProps['session']
  /** App name displayed in the sidebar header */
  systemName?: string
  /** Full logo URL (expanded sidebar) */
  logoUrl?: string
  /** Compact logo URL (collapsed sidebar) */
  compactLogoUrl?: string
  /** Logo height in pixels */
  logoHeight?: number | string
  /** Logo max width (expanded sidebar) */
  logoMaxWidth?: number | string
  /** Logo height when the sidebar is collapsed (falls back to logoHeight) */
  compactLogoHeight?: number | string
  /** Logo max width when the sidebar is collapsed (falls back to logoMaxWidth) */
  compactLogoMaxWidth?: number | string
  /** Callback for sign-out action wired to the sidebar user menu */
  onSignOut?: () => void
  /** Callback to stop impersonation; forwarded to ModernSidebar */
  onStopImpersonation?: () => Promise<void>
  /**
   * OPT-IN: renders the `ImpersonationBanner` above the header while
   * `session.isImpersonating` is true. Off by default so it doesn't change
   * the layout for existing shell users. The "Voltar ao Original" item in
   * the sidebar footer keeps working with or without the banner.
   */
  showImpersonationBanner?: boolean
  /** Shows the language item in the user menu when >1 locale is configured. Default: true. */
  localeSwitcher?: boolean
  /** Profile route for the sidebar user menu's "Profile" item (disabled without it). */
  profileHref?: string

  // ── Header ──────────────────────────────────────────────────────────────
  /** Slot for header right-side actions (notifications, settings buttons, etc.) */
  headerActions?: React.ReactNode

  // ── Command Palette ─────────────────────────────────────────────────────
  /**
   * Additional app-specific quick actions appended after the auto-generated
   * navigation items from menuConfig. Use this for logout, create-X shortcuts, etc.
   */
  commandActions?: CommandPaletteItem[]

  // ── Breadcrumb ──────────────────────────────────────────────────────────
  breadcrumbProps?: AdminShellBreadcrumbProps
}

// ─── Menu flattening ─────────────────────────────────────────────────────────

/**
 * Flatten a MenuItem tree into CommandPaletteItem[] for navigation.
 * Groups are represented as "<Group> > <Item>" labels.
 */
function flattenMenuToCommandItems(
  items: MenuItem[],
  resolveIcon: (
    icon: string | IconComponent | undefined
  ) => IconComponent | undefined,
  router: ReturnType<typeof useRouter>,
  // Resolves I18nText -> string. Passed in (never called via useText() here) so
  // this stays a plain, non-hook, recursable helper — same convention as
  // `generateBreadcrumbFromMenu`'s `t`/`text` params in navigation/Breadcrumb.tsx.
  text: ReturnType<typeof useText>,
  parentTitle?: string
): CommandPaletteItem[] {
  const result: CommandPaletteItem[] = []

  for (const item of items) {
    // disabled entries are not navigable — keep them out of the palette
    if (item.type === 'separator' || item.isDisabled) continue

    if (item.type === 'single') {
      const single = item as SingleMenuItem
      const title = text(single.title) ?? ''
      const description = text(single.description) ?? ''
      result.push({
        id: single.id,
        label: parentTitle ? `${parentTitle} > ${title}` : title,
        type: 'navigation',
        icon: resolveIcon(single.icon),
        href: single.href,
        shortcut: single.shortcut,
        keywords: [title, description, single.id].filter(Boolean),
        onSelect: () => router.push(single.href),
      })
    } else if (item.type === 'group') {
      const group = item as GroupMenuItem
      const title = text(group.title) ?? ''
      const description = text(group.description) ?? ''
      // If the group has its own href, add it as a navigable item
      if (group.href) {
        result.push({
          id: group.id,
          label: title,
          type: 'navigation',
          icon: resolveIcon(group.icon),
          href: group.href,
          keywords: [title, description].filter(Boolean),
          onSelect: () => router.push(group.href!),
        })
      }
      // Recurse into children
      result.push(
        ...flattenMenuToCommandItems(
          group.children,
          resolveIcon,
          router,
          text,
          title
        )
      )
    }
  }

  return result
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * AdminShell — canonical admin app shell for @telamonjs/ui
 *
 * Composes `ModernSidebar` + `CommandPalette` (Cmd+K) + `ResponsiveBreadcrumb`
 * + sticky header with optional action slot into a single, ready-to-use shell.
 *
 * Replaces hand-rolled `AdminLayout` + `CommandPaletteProvider` boilerplate in
 * consumer apps.
 *
 * @example
 * ```tsx
 * // app/admin/layout.tsx
 * 'use client'
 * import { AdminShell } from '@telamonjs/ui'
 * import { menuConfig } from '@/config/menu'
 *
 * export default function AdminLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <AdminShell
 *       menuConfig={menuConfig}
 *       systemName="MyApp"
 *       logoUrl="/logo.png"
 *       onSignOut={() => signOut({ callbackUrl: '/sign-in' })}
 *     >
 *       {children}
 *     </AdminShell>
 *   )
 * }
 * ```
 */
export function AdminShell({
  children,
  className,
  contentClassName,
  menuConfig,
  can,
  session,
  systemName,
  logoUrl,
  compactLogoUrl,
  logoHeight,
  logoMaxWidth,
  compactLogoHeight,
  compactLogoMaxWidth,
  onSignOut,
  onStopImpersonation,
  showImpersonationBanner = false,
  localeSwitcher = true,
  profileHref,
  headerActions,
  commandActions,
  breadcrumbProps,
}: AdminShellProps) {
  const router = useRouter()
  const t = useTelamonjsT()
  const text = useText()

  // Own instance of the "back to original" state — the sidebar has its own
  // for the footer item; both call the same `onStopImpersonation`.
  const { isPending: isStoppingImpersonation, stop: stopImpersonation } =
    useStopImpersonation(onStopImpersonation, 'AdminShell')

  // ponytail: getIcon() is already an O(1) map lookup — a ref-based cache on
  // top of it added no measurable benefit and read/wrote a ref during render
  // (disallowed by react-compiler). Call it directly.
  const resolveIcon = useCallback(
    (icon: string | IconComponent | undefined): IconComponent | undefined => {
      if (!icon) return undefined
      if (typeof icon !== 'string') return icon
      return getIcon(icon)
    },
    []
  )

  // The Cmd/Ctrl+K listener lives here; the palette body (cmdk) loads on first open
  // and stays mounted afterwards so its exit animation and state are preserved.
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteMounted, setPaletteMounted] = useState(false)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteMounted(true)
        setPaletteOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // What the user may navigate to; the breadcrumb keeps the full menu
  const providerCan = usePermissionChecker()
  const menuCan = can ?? providerCan
  const visibleMenu = useMemo(
    () => (menuCan ? filterMenuByPermission(menuConfig, menuCan) : menuConfig),
    [menuConfig, menuCan]
  )

  // Flatten menu into CommandPaletteItems for navigation
  const navigationItems = useMemo(
    () => flattenMenuToCommandItems(visibleMenu, resolveIcon, router, text),
    [visibleMenu, resolveIcon, router, text]
  )

  // Merge navigation items with app-provided command actions
  const allCommandItems = useMemo<CommandPaletteItem[]>(
    () => [...navigationItems, ...(commandActions ?? [])],
    [navigationItems, commandActions]
  )

  return (
    <div className='flex h-screen overflow-hidden bg-background'>
      {/* Sidebar — manages mobile drawer and desktop compact/expanded state internally */}
      <ModernSidebar
        menuConfig={visibleMenu}
        session={session}
        systemName={systemName}
        logoUrl={logoUrl}
        compactLogoUrl={compactLogoUrl}
        logoHeight={logoHeight}
        logoMaxWidth={logoMaxWidth}
        compactLogoHeight={compactLogoHeight}
        compactLogoMaxWidth={compactLogoMaxWidth}
        onSignOut={onSignOut}
        onStopImpersonation={onStopImpersonation}
        mobileTriggerPosition='top-left'
        showUserAvatar
        showUserRole
        localeSwitcher={localeSwitcher}
        profileHref={profileHref}
      />

      {/* Main Column */}
      <div className='flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/50'>
        {/* Impersonation banner (opt-in) — acima do header, fora da área rolável */}
        {showImpersonationBanner && (
          <ImpersonationBanner
            isImpersonating={session?.isImpersonating}
            currentUserName={session?.user?.name}
            originalUserName={session?.originalUser?.name}
            onStop={
              onStopImpersonation ? () => void stopImpersonation() : undefined
            }
            isPending={isStoppingImpersonation}
          />
        )}

        {/* Sticky Header */}
        <header className='sticky top-0 z-30 border-b border-slate-200/60 bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80'>
          <div className='flex h-16 items-center justify-between px-4 lg:px-6'>
            {/* Left: breadcrumb (offset right of the mobile sidebar trigger) */}
            <div className='flex min-w-0 flex-1 items-center pl-14 md:pl-0'>
              <ResponsiveBreadcrumb
                menuConfig={menuConfig}
                showActions={false}
                maxItems={4}
                entityName={breadcrumbProps?.entityName}
                customSegments={breadcrumbProps?.customSegments}
              />
            </div>

            {/* Right: header actions slot */}
            {headerActions && (
              <div className='ml-4 flex items-center space-x-2'>
                {headerActions}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable content area */}
        <main
          className={cn(
            'custom-scrollbar smooth-scroll flex-1',
            'flex flex-col overflow-auto',
            contentClassName,
            className
          )}
        >
          <div className='max-w-full flex-1 min-h-0 flex flex-col'>
            {children}
          </div>
        </main>
      </div>

      {/* Global Cmd+K Command Palette — rendered outside the flex layout to avoid clipping */}
      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandPalette
            items={allCommandItems}
            placeholder={t('shell.searchPlaceholder')}
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            enableShortcut={false}
            className='max-w-2xl'
          />
        </Suspense>
      )}
    </div>
  )
}
