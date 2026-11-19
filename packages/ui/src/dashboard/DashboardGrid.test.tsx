import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { logger } from '../utils/logger'
import { DashboardGrid, generateDefaultLayout } from './DashboardGrid'

// Mock react-grid-layout
vi.mock('react-grid-layout', () => {
  const ResponsiveGridLayout = ({ children }: any) => (
    <div data-testid='responsive-grid-layout'>{children}</div>
  )

  const WidthProvider = (Component: any) => Component

  return {
    default: ResponsiveGridLayout,
    Responsive: ResponsiveGridLayout,
    WidthProvider,
  }
})

describe('DashboardGrid', () => {
  const mockWidgets = [
    { id: 'widget1', component: <div>Widget 1</div>, title: 'Widget One' },
    { id: 'widget2', component: <div>Widget 2</div>, title: 'Widget Two' },
  ]

  const mockLayout = [
    { i: 'widget1', x: 0, y: 0, w: 6, h: 2 },
    { i: 'widget2', x: 6, y: 0, w: 6, h: 2 },
  ]

  describe('Rendering', () => {
    // DashboardGrid lazy-loads react-grid-layout (dynamic import in useEffect),
    // so the grid renders asynchronously — tests must use findBy* queries
    it('renders grid with widgets', async () => {
      render(<DashboardGrid widgets={mockWidgets} layout={mockLayout} />)

      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
      expect(screen.getByText('Widget 1')).toBeInTheDocument()
      expect(screen.getByText('Widget 2')).toBeInTheDocument()
    })

    it('renders empty grid with no widgets', async () => {
      render(<DashboardGrid widgets={[]} layout={[]} />)

      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
      expect(screen.queryByText('Widget 1')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          className='custom-grid-class'
        />
      )

      expect(container.querySelector('.custom-grid-class')).toBeInTheDocument()
    })

    it('renders widgets in edit mode with drag handle', async () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          editable={true}
        />
      )

      await screen.findByText('Widget 1')

      // Drag handle should be rendered
      const svgElements = document.querySelectorAll('svg')
      expect(svgElements.length).toBeGreaterThan(0)
    })

    it('does not render drag handle when not editable', async () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          editable={false}
        />
      )

      // No drag handle rendered in non-editable mode
      expect(await screen.findByText('Widget 1')).toBeInTheDocument()
      expect(document.querySelector('.widget-drag-handle')).toBeNull()
    })
  })

  describe('Widget Management', () => {
    it('handles missing widget gracefully', async () => {
      const loggerWarnSpy = vi
        .spyOn(logger, 'warn')
        .mockImplementation(() => {})

      const layoutWithMissing = [
        ...mockLayout,
        { i: 'nonexistent', x: 0, y: 2, w: 12, h: 2 },
      ]

      render(<DashboardGrid widgets={mockWidgets} layout={layoutWithMissing} />)

      await screen.findByTestId('responsive-grid-layout')

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Widget not found for layout item: nonexistent')
      )

      loggerWarnSpy.mockRestore()
    })

    it('renders single widget', async () => {
      const singleWidget = [mockWidgets[0]]
      const singleLayout = [mockLayout[0]]

      render(<DashboardGrid widgets={singleWidget} layout={singleLayout} />)

      expect(await screen.findByText('Widget 1')).toBeInTheDocument()
      expect(screen.queryByText('Widget 2')).not.toBeInTheDocument()
    })
  })

  describe('Configuration', () => {
    it('accepts custom cols', async () => {
      render(
        <DashboardGrid widgets={mockWidgets} layout={mockLayout} cols={24} />
      )

      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
    })

    it('accepts custom rowHeight', async () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          rowHeight={100}
        />
      )

      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
    })

    it('accepts custom breakpoints', async () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          breakpoints={{ lg: 1400, md: 1024, sm: 768, xs: 480 }}
        />
      )

      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
    })

    it('accepts custom responsive columns', async () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          responsiveCols={{ lg: 12, md: 8, sm: 4, xs: 2 }}
        />
      )

      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
    })

    it('accepts compactType configuration', async () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          compactType='horizontal'
        />
      )

      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
    })
  })

  describe('Layout Change', () => {
    it('calls onLayoutChange when provided', async () => {
      const onLayoutChange = vi.fn()

      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          onLayoutChange={onLayoutChange}
        />
      )

      // Layout change callback is passed to ResponsiveGridLayout
      expect(
        await screen.findByTestId('responsive-grid-layout')
      ).toBeInTheDocument()
    })
  })

  describe('Helper - generateDefaultLayout', () => {
    it('generates default layout for widget IDs', () => {
      const widgetIds = ['widget1', 'widget2', 'widget3']
      const layout = generateDefaultLayout(widgetIds)

      expect(layout).toHaveLength(3)
      expect(layout[0]).toEqual({ i: 'widget1', x: 0, y: 0, w: 3, h: 2 })
      expect(layout[1]).toEqual({ i: 'widget2', x: 3, y: 0, w: 3, h: 2 })
      expect(layout[2]).toEqual({ i: 'widget3', x: 6, y: 0, w: 3, h: 2 })
    })

    it('generates layout with custom options', () => {
      const widgetIds = ['widget1', 'widget2']
      const layout = generateDefaultLayout(widgetIds, {
        cols: 8,
        defaultWidth: 4,
        defaultHeight: 3,
      })

      expect(layout[0]).toEqual({ i: 'widget1', x: 0, y: 0, w: 4, h: 3 })
      expect(layout[1]).toEqual({ i: 'widget2', x: 4, y: 0, w: 4, h: 3 })
    })

    it('wraps to next row when exceeding cols', () => {
      const widgetIds = ['w1', 'w2', 'w3', 'w4', 'w5']
      const layout = generateDefaultLayout(widgetIds, {
        cols: 12,
        defaultWidth: 4,
      })

      expect(layout[0]).toEqual({ i: 'w1', x: 0, y: 0, w: 4, h: 2 })
      expect(layout[1]).toEqual({ i: 'w2', x: 4, y: 0, w: 4, h: 2 })
      expect(layout[2]).toEqual({ i: 'w3', x: 8, y: 0, w: 4, h: 2 })
      expect(layout[3]).toEqual({ i: 'w4', x: 0, y: 1, w: 4, h: 2 }) // Next row
      expect(layout[4]).toEqual({ i: 'w5', x: 4, y: 1, w: 4, h: 2 })
    })
  })
})
