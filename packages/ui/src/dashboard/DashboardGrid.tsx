'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '../utils'
import { logger } from '../utils/logger'

// react-grid-layout CSS lives in index.css (imported by the consuming app).

// Layout item type compatible with both react-grid-layout v1.x and v2.x
export interface Layout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  static?: boolean
  isDraggable?: boolean
  isResizable?: boolean
  isBounded?: boolean
}

export interface Widget {
  /**
   * Unique widget ID (must match layout.i)
   */
  id: string

  /**
   * Widget content/component
   */
  component: ReactNode

  /**
   * Widget title (optional, for edit mode)
   */
  title?: string

  /**
   * Widget type (for filtering/categorization)
   */
  type?: string
}

export interface DashboardGridProps {
  /**
   * Widgets to display
   */
  widgets: Widget[]

  /**
   * Grid layout configuration
   */
  layout: Layout[]

  /**
   * Callback when layout changes (drag/resize)
   */
  onLayoutChange?: (layout: Layout[]) => void

  /**
   * Enable edit mode (draggable/resizable)
   * @default false
   */
  editable?: boolean

  /**
   * @deprecated Ignored — the grid is responsive, so column counts come from
   * `responsiveCols` (default `{ lg: 12, md: 10, sm: 6, xs: 4 }`). Removed in
   * the next major.
   */
  cols?: number

  /**
   * Row height in pixels
   * @default 60
   */
  rowHeight?: number

  /**
   * Responsive breakpoints
   */
  breakpoints?: { lg?: number; md?: number; sm?: number; xs?: number }

  /**
   * Responsive column counts
   */
  responsiveCols?: { lg?: number; md?: number; sm?: number; xs?: number }

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Compact type (vertical | horizontal | null)
   * @default 'vertical'
   */
  compactType?: 'vertical' | 'horizontal' | null
}

/**
 * DashboardGrid - Drag-and-drop dashboard layout
 *
 * Powered by react-grid-layout for customizable widget positioning.
 * react-grid-layout is a browser-only library — loaded dynamically to avoid
 * SSR module evaluation errors in Next.js.
 *
 * @example
 * ```tsx
 * const widgets = [
 *   { id: 'stats', component: <StatCard title="Users" value="1,234" /> },
 *   { id: 'chart', component: <ChartWidget title="Revenue" data={data} /> },
 * ]
 *
 * const layout = [
 *   { i: 'stats', x: 0, y: 0, w: 3, h: 2 },
 *   { i: 'chart', x: 3, y: 0, w: 9, h: 4 },
 * ]
 *
 * <DashboardGrid
 *   widgets={widgets}
 *   layout={layout}
 *   editable
 *   onLayoutChange={(newLayout) => saveLayout(newLayout)}
 * />
 * ```
 */
export function DashboardGrid({
  widgets,
  layout,
  onLayoutChange,
  editable = false,
  rowHeight = 60,
  breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 },
  responsiveCols = { lg: 12, md: 10, sm: 6, xs: 4 },
  className,
  compactType = 'vertical',
}: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ResponsiveGrid, setResponsiveGrid] = useState<any>(null)

  useEffect(() => {
    // Lazy-load react-grid-layout — it accesses browser APIs at module eval time,
    // so it must not be imported at the top level (would fail during SSR prerender)
    import('react-grid-layout').then(mod => {
      setResponsiveGrid(() => mod.Responsive)
    })

    const el = containerRef.current
    if (!el) return

    setContainerWidth(el.getBoundingClientRect().width)

    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Create widget map for quick lookup
  const widgetMap = new Map(widgets.map(w => [w.id, w]))

  return (
    <div ref={containerRef} className={cn('dashboard-grid', className)}>
      {ResponsiveGrid && (
        <ResponsiveGrid
          width={containerWidth}
          className='layout'
          layouts={{ lg: layout }}
          breakpoints={breakpoints}
          cols={responsiveCols}
          rowHeight={rowHeight}
          isDraggable={editable}
          isResizable={editable}
          compactType={compactType}
          onLayoutChange={onLayoutChange}
          draggableHandle='.widget-drag-handle'
        >
          {layout.map(item => {
            const widget = widgetMap.get(item.i)

            if (!widget) {
              logger.warn(`Widget not found for layout item: ${item.i}`)
              return null
            }

            return (
              <div
                key={item.i}
                className={cn('widget-container rounded-lg', {
                  'cursor-move': editable,
                })}
              >
                {editable && (
                  <div className='widget-drag-handle absolute right-2 top-2 z-10 cursor-move rounded bg-muted p-1 opacity-0 transition-opacity group-hover:opacity-100'>
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 16 16'
                      fill='currentColor'
                    >
                      <circle cx='4' cy='4' r='1.5' />
                      <circle cx='12' cy='4' r='1.5' />
                      <circle cx='4' cy='8' r='1.5' />
                      <circle cx='12' cy='8' r='1.5' />
                      <circle cx='4' cy='12' r='1.5' />
                      <circle cx='12' cy='12' r='1.5' />
                    </svg>
                  </div>
                )}
                <div className='widget-content h-full w-full'>
                  {widget.component}
                </div>
              </div>
            )
          })}
        </ResponsiveGrid>
      )}
    </div>
  )
}

/**
 * Helper function to generate default layout
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper tightly coupled to DashboardGrid's Layout type, not worth a separate file
export function generateDefaultLayout(
  widgetIds: string[],
  options: {
    cols?: number
    defaultWidth?: number
    defaultHeight?: number
  } = {}
): Layout[] {
  const { cols = 12, defaultWidth = 3, defaultHeight = 2 } = options

  return widgetIds.map((id, index) => {
    const row = Math.floor((index * defaultWidth) / cols)
    const col = (index * defaultWidth) % cols

    return {
      i: id,
      x: col,
      y: row,
      w: defaultWidth,
      h: defaultHeight,
    }
  })
}
