'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { Badge } from '../ui/badge'
import { cn } from '../utils'
import { resolveIcon } from '../utils/icon'
import { useTelamonjsT, useText } from '../i18n/use-t'
import { cardColors } from '../components/cards/colors'
import type { CardColor } from '../components/cards/types'
import type { TabItem } from './content-tabs'
import type { I18nText } from '../i18n/msg'

export type PortalItem = TabItem & {
  /** Accent color for the icon/rail state. Default: 'blue'. */
  color?: CardColor
  /** Short copy shown under the label on the grid launcher card (I18nText). */
  description?: I18nText
  /**
   * Group label. Items sharing the same `group`, consecutively, render as one
   * visual block (grid heading + cluster, rail label + separator). Group
   * order follows item order. Omit for ungrouped items — default, no
   * heading/label, fully backward-compatible.
   */
  group?: string
  /**
   * Default padding of the content panel (`p-4 lg:p-6`, same as
   * `PageContent`). Defaults to `true`. Pass `false` for content
   * that handles its own spacing: lists (embedded ListPage/EntityListPage,
   * infinite list), `ContentTabs` and full-bleed inline forms
   * (e.g. the form footer in ViewPortalDialog).
   */
  padded?: boolean
}

interface PortalBlock {
  group?: string
  items: PortalItem[]
}

/** Run-length groups consecutive items sharing the same `group`. */
function groupPortalItems(tabs: PortalItem[]): PortalBlock[] {
  const blocks: PortalBlock[] = []
  for (const item of tabs) {
    const last = blocks[blocks.length - 1]
    if (last && last.group === item.group) {
      last.items.push(item)
    } else {
      blocks.push({ group: item.group, items: [item] })
    }
  }
  return blocks
}

const GROUP_LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

// Tailwind cannot compile dynamic classes (`lg:grid-cols-${n}`) — static map.
// Mobile (grid-cols-2) and sm (sm:grid-cols-3) stay fixed for every value;
// only the ceiling changes. 4 == pre-`columns` behavior (default).
const GRID_COLUMNS_CLASS: Record<number, string> = {
  3: 'grid-cols-2 gap-4 sm:grid-cols-3',
  4: 'grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
}

function gridColumnsClass(columns?: number): string {
  return (columns && GRID_COLUMNS_CLASS[columns]) || GRID_COLUMNS_CLASS[4]
}

export interface ContentPortalProps {
  tabs: PortalItem[]
  /** Initial section value (uncontrolled). Omit to start on the grid. */
  defaultValue?: string
  /** Controlled active section. `null` renders the grid stage. */
  value?: string | null
  onValueChange?: (value: string | null) => void
  className?: string
  /**
   * Max grid columns at wide breakpoints (stage-1 launcher). One of
   * 3/4/5/6 — default 4 (pre-`columns` behavior). Mobile/sm collapse is
   * unaffected; unsupported values fall back to the default.
   */
  columns?: number
  /**
   * Keep a visited panel mounted (hidden) after navigating away, so its
   * state survives re-entry — the default, and the pre-`keepAlive` behavior.
   * Set `false` to unmount an inactive panel instead: needed when the panel
   * itself opens a dialog by URL (e.g. an embedded `ListPage`), since two
   * kept-alive panels would each keep their own dialog mounted and stack up.
   */
  keepAlive?: boolean
  /**
   * Below `md`, make the active panel a height-bounded flex column
   * (`flex-1 min-h-0 flex-col`) instead of a plain `block`, so content such
   * as an infinite list can be its own scroll container on mobile. Needs a
   * height-bounded parent (e.g. `AdminPortal` in a `ShellPage`); the content
   * should take the space with `flex-1 min-h-0`. Default `false` (panel
   * grows with its content and the page scrolls). `md+` is unchanged.
   */
  mobileFill?: boolean
  /**
   * Inside a height-bounded flex column such as a dialog body (set by
   * `ViewPortalDialog`): the root takes the remaining height at `md+`
   * (`md:flex-1 md:min-h-0`) so the `md:h-full` chain down to the panel
   * (and `PortalSection`) reaches the bottom without a structural selector.
   * Default `false`. No effect below `md`.
   */
  fill?: boolean
}

const DEFAULT_COLOR: CardColor = 'blue'

/**
 * Resolves and renders a portal item's icon. Plain function (not a
 * component) so react-compiler doesn't treat the locally-resolved icon as a
 * JSX element type created during render.
 */
function renderPortalIcon(icon: PortalItem['icon'], className: string) {
  const Icon = resolveIcon(icon ?? 'Circle')
  return <Icon className={className} />
}

/** Rail entry for one section (~35 lines): gradient icon + label + badge. */
function PortalNavItem({
  item,
  isActive,
  onSelect,
}: {
  item: PortalItem
  isActive: boolean
  onSelect: () => void
}) {
  const text = useText()
  const styles = cardColors.accent[item.color ?? DEFAULT_COLOR]
  const ref = useRef<HTMLButtonElement>(null)
  // Mobile rail is a horizontal strip: keep the active section in view
  // (also on a deep-linked first render). Scrolls only the strip itself —
  // scrollIntoView would also scroll the window (page jump on load).
  useEffect(() => {
    const el = ref.current
    const nav = el?.parentElement
    if (!isActive || !el || !nav || nav.scrollWidth <= nav.clientWidth) return
    const offset =
      el.getBoundingClientRect().left - nav.getBoundingClientRect().left
    if (offset < 0 || offset + el.offsetWidth > nav.clientWidth)
      nav.scrollTo?.({ left: nav.scrollLeft + offset - 8 })
  }, [isActive])

  return (
    <button
      ref={ref}
      type='button'
      onClick={onSelect}
      data-testid={`content-portal-item-${item.value}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex shrink-0 md:w-full items-center gap-3 rounded-xl px-2.5 py-1 text-left transition-all',
        isActive
          ? cn('bg-card shadow-md ring-2', styles.ring)
          : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          'bg-gradient-to-br text-white shadow',
          styles.iconGradient
        )}
      >
        {renderPortalIcon(item.icon, 'h-3.5 w-3.5')}
      </span>
      <span className='flex-1 min-w-0 truncate text-sm font-medium'>
        {text(item.label)}
      </span>
      {item.badge !== undefined && (
        <Badge className='ml-auto shrink-0'>{item.badge}</Badge>
      )}
    </button>
  )
}

/** Grid launcher card for one section (stage-1). */
function PortalGridCard({
  item,
  onSelect,
}: {
  item: PortalItem
  onSelect: () => void
}) {
  const text = useText()
  const styles = cardColors.accent[item.color ?? DEFAULT_COLOR]

  return (
    <button
      type='button'
      onClick={onSelect}
      data-testid={`content-portal-item-${item.value}`}
      className='group relative flex flex-col items-center rounded-xl bg-card p-4 text-center shadow-sm transition-all duration-200 hover:shadow-md'
    >
      {item.badge !== undefined && (
        <Badge className='absolute right-2 top-2'>{item.badge}</Badge>
      )}
      <span
        className={cn(
          'mb-3 flex h-14 w-14 items-center justify-center rounded-xl',
          'bg-gradient-to-br text-white shadow-lg',
          'transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3',
          styles.iconGradient,
          styles.iconShadow
        )}
      >
        {renderPortalIcon(item.icon, 'h-7 w-7')}
      </span>
      <span className='text-sm font-medium text-foreground'>
        {text(item.label)}
      </span>
      {item.description && (
        <span className='mt-1 text-xs text-muted-foreground'>
          {text(item.description)}
        </span>
      )}
    </button>
  )
}

// overflow-y-auto: whenever a flex parent caps the launcher's height
// (AdminPortal's flex-1 min-h-0, or a bounded dialog such as ViewDialog at
// md+), the cards scroll inside the muted background instead of spilling
// past it. No-op when the launcher is shrink-wrapped.
const GRID_STAGE_CLASS = 'rounded-2xl bg-muted/50 p-6 overflow-y-auto'

/**
 * ContentPortal - Two-stage section navigation: a launcher grid of cards,
 * then (once a section is picked) a sticky rail alongside the panel.
 *
 * Prefer this over `ContentTabs` for detail views with many sections (6+) —
 * a horizontally-scrolling tab strip is a poor discovery UX at that count.
 *
 * @category Layout
 */
export function ContentPortal({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className,
  columns,
  keepAlive = true,
  mobileFill = false,
  fill = false,
}: ContentPortalProps) {
  const t = useTelamonjsT()
  const isControlled = value !== undefined
  // A defaultValue that doesn't match any tab (stale/hidden section) falls
  // back to the grid rather than opening an empty section stage.
  const [internalActive, setInternalActive] = useState<string | null>(() => {
    if (!defaultValue) return null
    return tabs.some(t => t.value === defaultValue) ? defaultValue : null
  })
  const active = isControlled ? value : internalActive

  const setActive = (next: string | null) => {
    if (!isControlled) setInternalActive(next)
    onValueChange?.(next)
  }

  // Keep-alive: mount a panel the first time its section is visited, then
  // keep it mounted (hidden via CSS) so state isn't lost when navigating
  // away and back. Same pattern as ContentTabs' `mountedTabs`. Updated
  // during render (not an effect) per React's "adjusting state when a prop
  // changes" pattern — guarded by the `has()` check so it only fires once
  // per newly-visited section, converging without an extra visible frame.
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() =>
    active ? new Set([active]) : new Set()
  )
  if (keepAlive && active && !mountedTabs.has(active)) {
    setMountedTabs(prev => new Set(prev).add(active))
  }

  const rootFill = fill && 'md:flex-1 md:min-h-0'
  const groups = groupPortalItems(tabs)
  // Nothing uses `group` → identical markup to the pre-group implementation.
  const isFlat =
    groups.length === 0 || (groups.length === 1 && !groups[0].group)

  // ---- Stage 1: grid launcher --------------------------------------------
  if (active === null) {
    if (isFlat) {
      return (
        <div className={cn(GRID_STAGE_CLASS, rootFill, className)}>
          <div className={cn('grid', gridColumnsClass(columns))}>
            {tabs.map(item => (
              <PortalGridCard
                key={item.value}
                item={item}
                onSelect={() => setActive(item.value)}
              />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className={cn(GRID_STAGE_CLASS, rootFill, className)}>
        <div className='space-y-6'>
          {groups.map((block, i) => (
            <div key={block.group ?? `_ungrouped_${i}`}>
              {block.group && (
                <h3
                  className={cn(
                    'mb-3 px-1',
                    GROUP_LABEL_CLASS,
                    i > 0 && 'border-t border-border pt-6'
                  )}
                >
                  {block.group}
                </h3>
              )}
              <div className={cn('grid', gridColumnsClass(columns))}>
                {block.items.map(item => (
                  <PortalGridCard
                    key={item.value}
                    item={item}
                    onSelect={() => setActive(item.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---- Stage 2: section + rail --------------------------------------------
  return (
    <div
      className={cn(
        // md:gap-0 — the panel/form starts right at the rail's scrollbar
        'flex flex-col gap-4 md:min-h-0 md:flex-row md:gap-0',
        rootFill,
        className
      )}
    >
      <nav
        aria-label={t('shell.sections')}
        className='flex shrink-0 gap-1 overflow-x-auto bg-muted/40 p-1 md:w-52 md:flex-col md:overflow-y-auto md:border-r md:border-border md:py-4'
      >
        <button
          type='button'
          onClick={() => setActive(null)}
          data-testid='content-portal-item-all'
          className='flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1 text-sm font-medium text-muted-foreground transition-all hover:bg-card/80 hover:text-foreground'
        >
          <LayoutGrid className='h-4 w-4 shrink-0' />
          <span className='md:hidden'>{t('shell.menu')}</span>
          <span className='hidden md:inline'>{t('shell.allSections')}</span>
        </button>

        {groups.map((block, i) => (
          <Fragment key={block.group ?? `_ungrouped_${i}`}>
            {block.group && (
              <div
                className={cn(
                  'shrink-0 px-2.5 pb-1 pt-3',
                  GROUP_LABEL_CLASS,
                  i > 0 && 'mt-2 border-t border-border pt-3'
                )}
              >
                {block.group}
              </div>
            )}
            {block.items.map(item => (
              <PortalNavItem
                key={item.value}
                item={item}
                isActive={active === item.value}
                onSelect={() => setActive(item.value)}
              />
            ))}
          </Fragment>
        ))}
      </nav>

      {/* per-item padding (`padded`, default true); `padded: false` = full-bleed
          for lists/tabs/inline forms that handle their own spacing */}
      <div
        className={cn(
          'min-w-0 flex-1 md:overflow-y-auto',
          mobileFill && 'flex min-h-0 flex-col max-md:overflow-hidden md:block'
        )}
      >
        {tabs.map(item => {
          const isActive = active === item.value
          if (!isActive && (!keepAlive || !mountedTabs.has(item.value)))
            return null
          return (
            <div
              key={item.value}
              data-testid={`content-portal-panel-${item.value}`}
              // md:h-full: forwards the panel height to the content (the flush
              // inline form depends on this chain to pin its footer)
              className={cn(
                !isActive
                  ? 'hidden'
                  : mobileFill
                    ? 'flex min-h-0 flex-1 flex-col md:block md:h-full'
                    : 'block md:h-full',
                isActive && item.padded !== false && 'p-4 lg:p-6'
              )}
            >
              {item.content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ContentPortal
