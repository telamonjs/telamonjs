'use client'

import React, { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  Home,
  MoreHorizontal,
  Sparkles,
  Edit,
  Eye,
  Plus,
} from 'lucide-react'
import { cn } from '../utils'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useMenuActions } from '../stores/menu-store'
import type { MenuItem, BreadcrumbData } from '../types/menu'
import { getIcon } from '../utils/icon'
import { useTelamonjsT, useText } from '../i18n/use-t'

type Translator = ReturnType<typeof useTelamonjsT>
type TextResolver = ReturnType<typeof useText>

/** Label override, or `{ label, href }` to also link a segment that is not a menu route. */
export type BreadcrumbSegmentOverride = string | { label: string; href?: string }
/** Keyed by full path (`/admin/clientes`) or by segment (`clientes`). Prefer a full-path key when
 * using `href`: a segment-name key applies to every path that contains that segment. */
export type BreadcrumbCustomSegments = Record<string, BreadcrumbSegmentOverride>

interface BreadcrumbProps {
  entityName?: string
  customSegments?: BreadcrumbCustomSegments
  showActions?: boolean
  maxItems?: number
  className?: string
  menuConfig?: MenuItem[]
}

// `label` is always a plain string here — every segment builder in this file
// (generateBreadcrumbFromMenu, the id/action/custom-segment branches below)
// resolves I18nText via `text()` before constructing a segment.
interface ResolvedBreadcrumbData extends Omit<BreadcrumbData, 'label'> {
  label: string
}

interface BreadcrumbSegment extends ResolvedBreadcrumbData {
  isLast: boolean
  isId: boolean
  type: 'section' | 'action' | 'entity'
  /** Only known routes (Home, menu entries) get a link — an intermediate URL
   * segment like `/admin/ferramentas` is usually not a page. */
  linkable: boolean
}

// Detect page type
function getPageContext(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const secondLastSegment = segments[segments.length - 2]

  // Detect IDs (UUIDs and numbers only)
  const isId = (segment: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment
    ) || /^\d+$/.test(segment)

  let pageType: 'list' | 'create' | 'edit' | 'view' = 'list'
  let entityId: string | undefined

  if (lastSegment === 'novo' || lastSegment === 'criar') {
    pageType = 'create'
  } else if (lastSegment === 'editar') {
    pageType = 'edit'
    if (secondLastSegment && isId(secondLastSegment)) {
      entityId = secondLastSegment
    }
  } else if (isId(lastSegment)) {
    pageType = 'view'
    entityId = lastSegment
  }

  return { pageType, entityId }
}

// Find a menu item by URL
function findMenuItemByPath(items: MenuItem[], path: string): MenuItem | null {
  for (const item of items) {
    if (item.type === 'single' && item.href === path) {
      return item
    }
    if (item.type === 'group') {
      if (item.href === path) return item
      const found = findMenuItemByPath(item.children, path)
      if (found) return found
    }
  }
  return null
}

// Conservative on purpose: slugs and job names (`gateway_selecionar-ids`)
// must never read as an id. Each non-numeric pattern needs a digit.
const ID_PATTERNS = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
  /^c(?=[a-z0-9]*\d)[a-z0-9]{24}$/, // cuid
  /^(?=[0-9a-f]*\d)[0-9a-f]{24}$/i, // Mongo ObjectId
  /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/, // ULID
  /^\d+$/,
]
const isIdSegment = (segment: string) =>
  ID_PATTERNS.some(pattern => pattern.test(segment))
/** Long ids read as `cm8x…ab12`; numbers and short ids stay whole. */
const shortId = (id: string) =>
  id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id

/** Group whose children live under `path` (e.g. `/admin/configuracoes` → "Configurações"). */
function findMenuGroupByPrefix(items: MenuItem[], path: string): MenuItem | null {
  for (const item of items) {
    if (item.type === 'group' && item.children.some(c => c.href.startsWith(path + '/'))) {
      return item
    }
  }
  return null
}

/**
 * Segments in URL order (Home first). Label precedence: `customSegments` by full
 * path or by segment → menu title → id/action → title of the menu group that
 * contains the path → prettified slug (`gateway_selecionar-ids` → "Gateway selecionar ids").
 * Only Home, menu routes and custom segments with `href` are linkable; the last
 * segment is the current page.
 */
function buildBreadcrumbSegments(
  pathname: string,
  menuConfig: MenuItem[],
  customSegments: BreadcrumbCustomSegments,
  t: Translator,
  text: TextResolver,
  entityName?: string
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [
    {
      label: t('shell.breadcrumbHome'),
      href: '/admin',
      icon: Home,
      isLast: false,
      isId: false,
      type: 'section',
      linkable: true,
    },
  ]

  let currentPath = ''
  const parts = pathname.split('/').filter(Boolean)
  parts.forEach((segment, i) => {
    currentPath += '/' + segment
    if (currentPath === '/admin') return // covered by Home

    const menuItem = findMenuItemByPath(menuConfig, currentPath)
    const isId = isIdSegment(segment)
    const raw = customSegments[currentPath] ?? customSegments[segment]
    const custom = typeof raw === 'string' ? { label: raw } : raw
    // The current page is never a link — a custom href is ignored on the last segment.
    const customHref = i < parts.length - 1 ? custom?.href : undefined
    let label: string
    let type: BreadcrumbSegment['type'] = 'section'
    let icon: BreadcrumbSegment['icon']

    if (menuItem?.title) {
      const rawIcon = menuItem.icon
      icon = typeof rawIcon === 'string' ? getIcon(rawIcon) : rawIcon
    }

    if (custom?.label) {
      label = custom.label
    } else if (menuItem?.title) {
      label = text(menuItem.title) ?? segment
    } else if (isId) {
      // The record's display name, when the page knows it; the short id otherwise
      label = entityName || t('navigation.idLabel', { value: shortId(segment) })
      type = 'entity'
    } else if (['novo', 'criar', 'new', 'editar', 'edit', 'visualizar', 'view'].includes(segment)) {
      type = 'action'
      label =
        segment === 'editar' || segment === 'edit'
          ? t('common.edit')
          : segment === 'visualizar' || segment === 'view'
            ? t('common.view')
            : t('common.create')
    } else {
      const group = findMenuGroupByPrefix(menuConfig, currentPath)
      const pretty = segment.replace(/[-_]+/g, ' ')
      label = (group?.title && text(group.title)) || pretty.charAt(0).toUpperCase() + pretty.slice(1)
    }

    segments.push({
      label,
      href: customHref ?? currentPath,
      icon,
      isLast: false,
      isId,
      type,
      linkable: Boolean(menuItem || customHref),
    })
  })

  segments[segments.length - 1].isLast = true
  return segments
}

export function Breadcrumb({
  entityName,
  customSegments = {},
  showActions = true,
  maxItems = 4,
  className,
  menuConfig = [],
}: BreadcrumbProps) {
  const pathname = usePathname()
  const { resetToHome } = useMenuActions()
  const t = useTelamonjsT()
  const text = useText()

  const breadcrumbData = useMemo(() => {
    const { pageType, entityId } = getPageContext(pathname)
    const segments = buildBreadcrumbSegments(pathname, menuConfig, customSegments, t, text, entityName)

    return {
      segments,
      pageType,
      entityId,
      hasActions: showActions && ['create', 'edit', 'view'].includes(pageType),
    }
  }, [pathname, customSegments, showActions, menuConfig, entityName, t, text])

  // `trailingSeparator=false` in the collapsed layout, which places its own separators
  const renderSegment = (segment: BreadcrumbSegment, index: number, trailingSeparator = true) => {
    const isLast = segment.isLast
    const Icon = segment.icon

    // Type-specific icons
    const ActionIcon =
      segment.type === 'action'
        ? segment.label === t('common.create')
          ? Plus
          : segment.label === t('common.edit')
            ? Edit
            : segment.label === t('common.view')
              ? Eye
              : null
        : null

    const content = (
      <div className='flex items-center gap-2 max-w-[200px]'>
        {Icon && !ActionIcon && (
          <Icon className='w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors' />
        )}
        {ActionIcon && (
          <ActionIcon className='w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors' />
        )}
        <span
          className={cn(
            'truncate text-sm transition-colors',
            isLast && 'font-medium text-foreground',
            !isLast && 'text-muted-foreground group-hover:text-primary',
            segment.type === 'action' && 'font-medium',
            segment.type === 'entity' && 'font-mono text-xs'
          )}
        >
          {segment.label}
        </span>
      </div>
    )

    return (
      <React.Fragment key={`${segment.href}-${index}`}>
        {/* no entrance fade: a per-index delayed fade left labels invisible
            ("Início › ›") on slow first loads */}
        <div className='flex items-center'>
          {(isLast && segment.href !== '/admin') || !segment.linkable ? (
            <div className='flex items-center gap-2 px-2 py-1'>{content}</div>
          ) : (
            <Link
              href={segment.href}
              onClick={segment.href === '/admin' ? resetToHome : undefined}
              className='group flex items-center gap-2 hover:bg-muted/50 rounded-md px-2 py-1 transition-colors'
            >
              {content}
            </Link>
          )}
        </div>

        {!isLast && trailingSeparator && (
          <ChevronRight className='w-4 h-4 text-muted-foreground shrink-0' />
        )}
      </React.Fragment>
    )
  }

  const renderCollapsedBreadcrumb = () => {
    const { segments } = breadcrumbData

    if (segments.length <= maxItems) {
      return segments.map((segment, index) => renderSegment(segment, index))
    }

    const firstSegment = segments[0]
    const lastSegments = segments.slice(-2)
    const collapsedSegments = segments.slice(1, -2)

    return (
      <>
        {/* Home always visible */}
        {renderSegment(firstSegment, 0, false)}

        {/* Collapsed segments */}
        {collapsedSegments.length > 0 && (
          <>
            <ChevronRight className='w-4 h-4 text-muted-foreground' />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-auto px-2 py-1 hover:bg-muted'
                  aria-label={t('navigation.hiddenSegments')}
                >
                  <MoreHorizontal className='w-4 h-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='min-w-[200px]'>
                {collapsedSegments.map((segment, i) =>
                  !segment.linkable ? (
                    <DropdownMenuItem key={`${segment.href}-${i}`} disabled className='flex items-center gap-2'>
                      {segment.icon && <segment.icon className='w-4 h-4' />}
                      <span className='truncate'>{segment.label}</span>
                    </DropdownMenuItem>
                  ) : (
                  <DropdownMenuItem key={`${segment.href}-${i}`} asChild>
                    <Link
                      href={segment.href}
                      onClick={
                        segment.href === '/admin' ? resetToHome : undefined
                      }
                      className='flex items-center gap-2'
                    >
                      {segment.icon && <segment.icon className='w-4 h-4' />}
                      <span className='truncate'>{segment.label}</span>
                    </Link>
                  </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Last segments always visible */}
        {lastSegments.map((segment, idx) => (
          <React.Fragment key={`${segment.href}-${idx}`}>
            <ChevronRight className='w-4 h-4 text-muted-foreground' />
            {renderSegment(segment, collapsedSegments.length + 1 + idx, false)}
          </React.Fragment>
        ))}
      </>
    )
  }

  return (
    <nav
      aria-label={t('navigation.breadcrumbNav')}
      className={cn('flex items-center space-x-2 text-sm', className)}
    >
      <div className='flex items-center space-x-2 min-w-0 flex-1'>
        {renderCollapsedBreadcrumb()}
      </div>

      {/* Context-based actions */}
      {breadcrumbData.hasActions && (
        <div className='flex items-center gap-2 ml-4'>
          {breadcrumbData.pageType === 'create' && (
            <Badge
              variant='default'
              className='bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50'
            >
              <Sparkles className='w-3 h-3 mr-1' />
              {t('navigation.creating')}
            </Badge>
          )}
          {breadcrumbData.pageType === 'edit' && (
            <Badge
              variant='default'
              className='bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
            >
              <Edit className='w-3 h-3 mr-1' />
              {t('navigation.editing')}
            </Badge>
          )}
          {breadcrumbData.pageType === 'view' && (
            <Badge
              variant='outline'
              className='bg-muted/50 text-muted-foreground border-border'
            >
              <Eye className='w-3 h-3 mr-1' />
              {t('navigation.viewing')}
            </Badge>
          )}
        </div>
      )}
    </nav>
  )
}

// Responsive version
export function ResponsiveBreadcrumb(props: BreadcrumbProps) {
  const { resetToHome } = useMenuActions()
  const pathname = usePathname()
  const t = useTelamonjsT()
  const text = useText()

  const breadcrumbData = useMemo(() => {
    const segments = buildBreadcrumbSegments(
      pathname,
      props.menuConfig ?? [],
      props.customSegments ?? {},
      t,
      text,
      props.entityName
    )
    return { segments }
  }, [pathname, props.customSegments, props.menuConfig, props.entityName, t, text])

  return (
    <>
      {/* Desktop */}
      <div className='hidden md:block'>
        <Breadcrumb {...props} maxItems={5} />
      </div>

      {/* Mobile - home icon + last segment */}
      <div className='block md:hidden'>
        <div className='flex items-center space-x-2 text-sm'>
          <Link
            href='/admin'
            onClick={resetToHome}
            className='group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors'
          >
            <Home className='w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors' />
          </Link>

          {breadcrumbData.segments.length > 1 && (
            <>
              <ChevronRight className='w-4 h-4 text-muted-foreground shrink-0' />
              <div className='flex items-center gap-2 max-w-[200px]'>
                {(() => {
                  const lastSegment =
                    breadcrumbData.segments[breadcrumbData.segments.length - 1]
                  const Icon = lastSegment.icon
                  return Icon ? (
                    <Icon className='w-4 h-4 shrink-0 text-muted-foreground' />
                  ) : null
                })()}
                <span className='truncate text-sm font-medium text-foreground'>
                  {
                    breadcrumbData.segments[breadcrumbData.segments.length - 1]
                      .label
                  }
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
