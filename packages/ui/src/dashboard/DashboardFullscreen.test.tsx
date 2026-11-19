import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DashboardFullscreen } from './DashboardFullscreen'
import { Activity } from 'lucide-react'

describe('DashboardFullscreen', () => {
  // 1. Rendering tests
  describe('Rendering', () => {
    it('renders when isOpen=true', () => {
      render(
        <DashboardFullscreen
          isOpen={true}
          onClose={() => {}}
          title='Test Dashboard'
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('does not render when isOpen=false', () => {
      render(
        <DashboardFullscreen
          isOpen={false}
          onClose={() => {}}
          title='Test Dashboard'
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      expect(screen.queryByText('Test Dashboard')).not.toBeInTheDocument()
    })

    it('renders with icon', () => {
      render(
        <DashboardFullscreen
          isOpen={true}
          onClose={() => {}}
          title='Test Dashboard'
          icon={Activity}
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
    })

    it('renders status indicator', () => {
      render(
        <DashboardFullscreen
          isOpen={true}
          onClose={() => {}}
          title='Test Dashboard'
          status='online'
          statusLabel='Sistema Online'
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      expect(screen.getByText('Sistema Online')).toBeInTheDocument()
    })
  })

  // 2. Interaction tests
  describe('Interactions', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn()
      render(
        <DashboardFullscreen
          isOpen={true}
          onClose={onClose}
          title='Test Dashboard'
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      const closeButton = screen.getByRole('button')
      fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when ESC key pressed', () => {
      const onClose = vi.fn()
      render(
        <DashboardFullscreen
          isOpen={true}
          onClose={onClose}
          title='Test Dashboard'
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not call onClose for other keys', () => {
      const onClose = vi.fn()
      render(
        <DashboardFullscreen
          isOpen={true}
          onClose={onClose}
          title='Test Dashboard'
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      fireEvent.keyDown(document, { key: 'Enter' })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  // 3. Accessibility
  describe('Accessibility', () => {
    it('has close button with proper role', () => {
      render(
        <DashboardFullscreen
          isOpen={true}
          onClose={() => {}}
          title='Test Dashboard'
        >
          <div>Content</div>
        </DashboardFullscreen>
      )

      const closeButton = screen.getByRole('button')
      expect(closeButton).toBeInTheDocument()
    })
  })
})
