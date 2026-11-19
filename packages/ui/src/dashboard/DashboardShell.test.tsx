import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DashboardShell } from './DashboardShell'
import { Activity } from 'lucide-react'

describe('DashboardShell', () => {
  // 1. Rendering tests
  describe('Rendering', () => {
    it('renders with title', () => {
      render(
        <DashboardShell title='Test Dashboard'>
          <div>Content</div>
        </DashboardShell>
      )
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
    })

    it('renders children', () => {
      render(
        <DashboardShell title='Test'>
          <div>Test Content</div>
        </DashboardShell>
      )
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      render(
        <DashboardShell title='Test' icon={Activity}>
          <div>Content</div>
        </DashboardShell>
      )
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <DashboardShell title='Test' description='Test Description'>
          <div>Content</div>
        </DashboardShell>
      )
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })
  })

  // 2. Layout modes
  describe('Layout Modes', () => {
    it('applies fullHeight mode by default', () => {
      const { container } = render(
        <DashboardShell title='Test'>
          <div>Content</div>
        </DashboardShell>
      )
      const shell = container.querySelector('.dashboard-shell-full')
      expect(shell).toHaveClass('h-full')
    })

    it('applies scroll mode when fullHeight=false', () => {
      const { container } = render(
        <DashboardShell title='Test' fullHeight={false}>
          <div>Content</div>
        </DashboardShell>
      )
      const shell = container.querySelector('.dashboard-shell-full')
      expect(shell).toHaveClass('min-h-0')
    })
  })

  // 3. Auto-refresh functionality
  describe('Auto-refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: [
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'Date',
        ],
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('calls onRefresh immediately on mount when autoRefresh=true', async () => {
      const onRefresh = vi.fn()
      render(
        <DashboardShell title='Test' autoRefresh={true} onRefresh={onRefresh}>
          <div>Content</div>
        </DashboardShell>
      )

      // Flush the immediate async refresh executed on mount
      await act(async () => {})

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('calls onRefresh at specified interval', async () => {
      const onRefresh = vi.fn()
      render(
        <DashboardShell
          title='Test'
          autoRefresh={true}
          autoRefreshInterval={10000}
          onRefresh={onRefresh}
        >
          <div>Content</div>
        </DashboardShell>
      )

      // Initial call (immediate on mount)
      await act(async () => {})
      expect(onRefresh).toHaveBeenCalledTimes(1)

      // After interval
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })
      expect(onRefresh).toHaveBeenCalledTimes(2)
    })

    it('does not call onRefresh when autoRefresh=false', async () => {
      const onRefresh = vi.fn()
      render(
        <DashboardShell title='Test' autoRefresh={false} onRefresh={onRefresh}>
          <div>Content</div>
        </DashboardShell>
      )

      await act(async () => {
        vi.advanceTimersByTime(60000)
      })

      expect(onRefresh).not.toHaveBeenCalled()
    })

    it('updates lastUpdate after refresh', async () => {
      const onRefresh = vi.fn()
      render(
        <DashboardShell title='Test' autoRefresh={true} onRefresh={onRefresh}>
          <div>Content</div>
        </DashboardShell>
      )

      await act(async () => {})
      expect(onRefresh).toHaveBeenCalled()

      // Should show "agora" (now)
      expect(screen.getByText('agora')).toBeInTheDocument()
    })
  })

  // 4. Fullscreen mode
  describe('Fullscreen', () => {
    it('opens fullscreen when allowFullscreen=true', () => {
      const { container } = render(
        <DashboardShell title='Test' allowFullscreen={true}>
          <div>Content</div>
        </DashboardShell>
      )

      const fullscreenButton = screen.getByTitle('Fullscreen')
      fireEvent.click(fullscreenButton)

      // Without fullscreenContent, CSS fullscreen mode is applied to the shell
      const shell = container.querySelector('.dashboard-shell-full')
      expect(shell).toHaveClass('fixed', 'inset-0', 'z-50')

      // Toggle button now offers exiting fullscreen
      expect(screen.getByTitle('Sair do fullscreen')).toBeInTheDocument()
    })

    it('does not render fullscreen when allowFullscreen=false', () => {
      render(
        <DashboardShell title='Test' allowFullscreen={false}>
          <div>Content</div>
        </DashboardShell>
      )

      expect(screen.queryByTitle('Fullscreen')).not.toBeInTheDocument()
    })

    it('renders custom fullscreenContent', () => {
      render(
        <DashboardShell
          title='Test'
          allowFullscreen={true}
          fullscreenContent={<div>Fullscreen Content</div>}
        >
          <div>Normal Content</div>
        </DashboardShell>
      )

      const fullscreenButton = screen.getByTitle('Fullscreen')
      fireEvent.click(fullscreenButton)

      expect(screen.getByText('Fullscreen Content')).toBeInTheDocument()
    })
  })

  // 5. Status and actions
  describe('Status and Actions', () => {
    it('renders status indicator', () => {
      render(
        <DashboardShell
          title='Test'
          status='online'
          statusLabel='Sistema Online'
        >
          <div>Content</div>
        </DashboardShell>
      )

      expect(screen.getByText('Sistema Online')).toBeInTheDocument()
    })

    it('renders custom actions', () => {
      render(
        <DashboardShell title='Test' actions={<button>Custom Action</button>}>
          <div>Content</div>
        </DashboardShell>
      )

      expect(screen.getByText('Custom Action')).toBeInTheDocument()
    })
  })

  // 6. Edit mode
  describe('Edit Mode', () => {
    it('calls onEditToggle when edit button clicked', () => {
      const onEditToggle = vi.fn()
      render(
        <DashboardShell
          title='Test'
          editable={false}
          onEditToggle={onEditToggle}
        >
          <div>Content</div>
        </DashboardShell>
      )

      fireEvent.click(screen.getByText('Editar'))
      expect(onEditToggle).toHaveBeenCalledWith(true)
    })
  })

  // 7. Search
  describe('Search', () => {
    it('calls onSearchChange when typing', () => {
      const onSearchChange = vi.fn()
      render(
        <DashboardShell
          title='Test'
          searchPlaceholder='Buscar...'
          onSearchChange={onSearchChange}
        >
          <div>Content</div>
        </DashboardShell>
      )

      const input = screen.getByPlaceholderText('Buscar...')
      fireEvent.change(input, { target: { value: 'test' } })
      expect(onSearchChange).toHaveBeenCalledWith('test')
    })
  })
})
