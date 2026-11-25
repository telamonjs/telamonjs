'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { cn } from '../utils'
import { useScrollableNav } from '../hooks/use-scrollable-nav'
import { useTelamonjsT, useText } from '../i18n/use-t'
import type { I18nText } from '../i18n/msg'
import type { IconComponent } from '../types/menu'
import { getIcon } from '../utils/icon'

/** Resolve string-or-component icon to a renderable component. */
function resolveIcon(icon: string | IconComponent): IconComponent {
  return typeof icon === 'string' ? getIcon(icon) : icon
}

export interface TabItem {
  value: string
  /** Tab label. `I18nText` — a literal or `msg('key')`. */
  label: I18nText
  /** Shorter label for mobile. */
  shortLabel?: I18nText
  /**
   * Tab icon. Accepts a string key resolved via `getIcon()` (preferred in link-mode
   * to avoid dual-instance TS errors) or a direct icon component.
   */
  icon?: string | IconComponent
  badge?: number | string
  content: React.ReactNode
}

export type ContentTabsVariant =
  | 'default'
  | 'underline'
  | 'pill'
  | 'glass'
  | 'gradient'

export interface ContentTabsProps {
  tabs: TabItem[]
  variant?: ContentTabsVariant
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  /**
   * When true, removes rounded corners and margins.
   * Use when tabs should be flush against a header or other element.
   */
  flush?: boolean
  /**
   * When true, uses compact sizing for tabs (smaller padding, font).
   */
  compact?: boolean
  /**
   * When true, the component participates in flex height chain.
   * Use when tabs content should fill available viewport height (e.g. maps).
   * Only applies to variant="default".
   */
  fillHeight?: boolean
}

// Custom styles for non-default variants
const listStyles: Record<Exclude<ContentTabsVariant, 'default'>, string> = {
  underline: 'bg-transparent border-b border-border rounded-none p-0 h-auto',
  pill: 'inline-flex gap-1 rounded-lg bg-muted p-1',
  glass:
    'inline-flex gap-1 rounded-xl px-1.5 py-2 bg-foreground/5 backdrop-blur-sm border border-border/50',
  gradient: 'inline-flex gap-1 rounded-xl bg-muted p-1',
}

const triggerStyles: Record<Exclude<ContentTabsVariant, 'default'>, string> = {
  underline: `
    relative pb-3 rounded-none bg-transparent
    text-muted-foreground hover:text-foreground
    after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0
    after:h-0.5 after:bg-primary after:rounded-full
    after:scale-x-0 after:transition-transform after:duration-300 after:origin-center
    data-[state=active]:bg-transparent data-[state=active]:text-primary
    data-[state=active]:after:scale-x-100
    data-[state=active]:shadow-none
  `,
  pill: `
    rounded-md px-4 py-2 text-muted-foreground
    transition-all duration-200
    hover:text-foreground
    data-[state=active]:bg-card data-[state=active]:text-primary
    data-[state=active]:shadow-sm
  `,
  glass: `
    rounded-lg px-4 py-2 text-muted-foreground
    transition-all duration-200
    hover:bg-card/40 hover:text-foreground
    data-[state=active]:bg-card/80 data-[state=active]:text-primary
    data-[state=active]:shadow-md
  `,
  gradient: `
    rounded-lg px-4 py-2 text-muted-foreground
    transition-all duration-300
    hover:text-foreground
    data-[state=active]:bg-gradient-to-r
    data-[state=active]:from-blue-500 data-[state=active]:to-purple-600
    data-[state=active]:text-white
    data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25
  `,
}

const contentStyles: Record<Exclude<ContentTabsVariant, 'default'>, string> = {
  underline: 'mt-4 border-0 p-0',
  pill: 'mt-6 border-0 p-0',
  glass: 'mt-6 border-0 p-0',
  gradient: 'mt-6 border-0 p-0',
}

/**
 * ContentTabs - High-level component for standardized tabs
 *
 * Variants:
 * - default: telamonjs AdminForm style (gradient background, active tab white with border)
 * - underline: animated line underneath
 * - pill: rounded background
 * - glass: glassmorphism
 * - gradient: blue-purple gradient
 */
export function ContentTabs({
  tabs,
  variant = 'default',
  defaultValue,
  value,
  onValueChange,
  className,
  flush = false,
  compact = false,
  fillHeight = false,
}: ContentTabsProps) {
  const t = useTelamonjsT()
  const text = useText()
  // For variant="default", use internal state when there is no external control
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? tabs[0]?.value
  )
  const currentValue = value ?? internalValue
  const handleValueChange = onValueChange ?? setInternalValue

  // Lazy mount: only render tabs when first visited (keep-alive pattern)
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => {
    const initial = value ?? defaultValue ?? tabs[0]?.value
    return initial ? new Set([initial]) : new Set()
  })

  // Updated during render (not an effect) per React's "adjusting state when
  // a prop changes" pattern — guarded by the `has()` check so it only fires
  // once per newly-visited tab.
  if (currentValue && !mountedTabs.has(currentValue)) {
    setMountedTabs(prev => new Set(prev).add(currentValue))
  }

  const {
    navRef,
    canScrollLeft,
    canScrollRight,
    scroll,
    startHoverScroll,
    stopHoverScroll,
    updateScrollState,
  } = useScrollableNav()

  // Auto-scroll the active tab into view
  useEffect(() => {
    const nav = navRef.current
    if (!nav || !currentValue) return
    const activeBtn = nav.querySelector(
      `[data-tab-value="${currentValue}"]`
    ) as HTMLElement | null
    if (!activeBtn) return
    const navRect = nav.getBoundingClientRect()
    const btnRect = activeBtn.getBoundingClientRect()
    if (btnRect.left < navRect.left) {
      nav.scrollBy({
        left: btnRect.left - navRect.left - 12,
        behavior: 'smooth',
      })
    } else if (btnRect.right > navRect.right) {
      nav.scrollBy({
        left: btnRect.right - navRect.right + 12,
        behavior: 'smooth',
      })
    }
  }, [currentValue, navRef])

  // Recalculate scroll state when tabs change
  useEffect(() => {
    updateScrollState()
  }, [tabs.length, updateScrollState])

  // Variant "default" - same style as telamonjs's AdminForm
  if (variant === 'default') {
    return (
      <div
        className={cn(
          'w-full',
          fillHeight && 'flex-1 flex flex-col min-h-0 overflow-hidden',
          className
        )}
      >
        {/* Tabs container - AdminForm style */}
        <div
          className={cn(
            'relative border-b border-border bg-gradient-to-r from-muted/40 to-muted/30',
            !flush && 'rounded-t-2xl'
          )}
        >
          {/* Left arrow */}
          {canScrollLeft && (
            <button
              type='button'
              onClick={() => scroll('left')}
              onMouseEnter={() => startHoverScroll('left')}
              onMouseLeave={stopHoverScroll}
              className='absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1 pr-3 bg-gradient-to-r from-muted/40 via-muted/40 to-transparent'
              aria-label={t('shell.scrollTabsLeft')}
            >
              <ChevronLeft className='h-4 w-4 text-muted-foreground' />
            </button>
          )}

          <nav
            ref={navRef}
            className={cn(
              'flex flex-nowrap overflow-x-auto scrollbar-hide',
              compact ? 'gap-1.5 px-3 py-1.5' : 'gap-3 p-3',
              canScrollLeft && 'pl-8',
              canScrollRight && 'pr-8'
            )}
            aria-label={t('shell.tabsNav')}
          >
            {tabs.map(tab => {
              const isActive = currentValue === tab.value

              return (
                <button
                  key={tab.value}
                  type='button'
                  data-tab-value={tab.value}
                  data-testid={`content-tab-${tab.value}`}
                  onClick={() => handleValueChange(tab.value)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-all duration-200',
                    compact
                      ? 'px-4 py-1.5 rounded-lg text-xs'
                      : 'px-7 py-3 rounded-xl text-sm',
                    !compact &&
                      'hover:bg-card/80 hover:shadow-md hover:scale-105',
                    compact && 'hover:bg-card/60 hover:shadow-sm',
                    isActive
                      ? compact
                        ? 'bg-card shadow-sm text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
                        : 'bg-card shadow-lg text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 scale-105'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.icon &&
                    (() => {
                      const TabIcon = resolveIcon(tab.icon)
                      return (
                        <span
                          className={cn(
                            'transition-colors',
                            isActive
                              ? 'text-blue-600 dark:text-blue-300'
                              : 'text-muted-foreground'
                          )}
                        >
                          <TabIcon
                            className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}
                          />
                        </span>
                      )
                    })()}
                  <span
                    className={tab.shortLabel ? 'hidden sm:inline' : undefined}
                  >
                    {text(tab.label)}
                  </span>
                  {tab.shortLabel && (
                    <span className='sm:hidden'>{text(tab.shortLabel)}</span>
                  )}
                  {tab.badge !== undefined && (
                    <Badge variant='secondary' className='ml-1 text-xs'>
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right arrow */}
          {canScrollRight && (
            <button
              type='button'
              onClick={() => scroll('right')}
              onMouseEnter={() => startHoverScroll('right')}
              onMouseLeave={stopHoverScroll}
              className='absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1 pl-3 bg-gradient-to-l from-muted/30 via-muted/30 to-transparent'
              aria-label={t('shell.scrollTabsRight')}
            >
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            </button>
          )}
        </div>

        {/* Content (lazy: mount on first visit, keep-alive after) */}
        <div
          className={cn(
            !flush && 'mt-4',
            fillHeight && 'flex-1 min-h-0 overflow-hidden'
          )}
        >
          {tabs.map(tab => {
            const isActive = currentValue === tab.value
            if (!isActive && !mountedTabs.has(tab.value)) return null
            return (
              <div
                key={tab.value}
                className={cn(
                  isActive ? 'block' : 'hidden',
                  fillHeight && 'h-full'
                )}
              >
                {tab.content}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Other variants - use Radix Tabs components
  return (
    <Tabs
      defaultValue={defaultValue ?? tabs[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={cn('w-full', className)}
    >
      <TabsList className={cn('justify-start', listStyles[variant])}>
        {tabs.map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn('flex items-center gap-2', triggerStyles[variant])}
          >
            {tab.icon &&
              (() => {
                const TI = resolveIcon(tab.icon)
                return <TI className='h-4 w-4' />
              })()}
            <span className={tab.shortLabel ? 'hidden sm:inline' : undefined}>
              {text(tab.label)}
            </span>
            {tab.shortLabel && (
              <span className='sm:hidden'>{text(tab.shortLabel)}</span>
            )}
            {tab.badge !== undefined && (
              <Badge
                variant='secondary'
                className={cn(
                  'ml-1 text-xs',
                  variant === 'gradient' &&
                    // eslint-disable-next-line no-restricted-syntax -- translucent white overlay on a colored gradient (readable in both themes)
                    'group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white'
                )}
              >
                {tab.badge}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className={contentStyles[variant]}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default ContentTabs
