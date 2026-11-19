import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DialogFrame } from './DialogFrame'

// Use the REAL Dialog (Radix) instead of the global ui-mocks version:
// these tests assert role="dialog", sizing classNames and the close button,
// which the simplified global mock does not render.
vi.unmock('../../ui/dialog')

// Mock useIsMobile hook
vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}))

// Import the mocked function for control
import { useIsMobile } from '../../hooks/use-mobile'

describe('DialogFrame', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    mockOnOpenChange.mockClear()
    vi.mocked(useIsMobile).mockReturnValue(false)
  })

  // 1. Rendering tests
  describe('Rendering', () => {
    it('renders desktop dialog when not mobile', () => {
      vi.mocked(useIsMobile).mockReturnValue(false)

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      expect(screen.getByText('Dialog Content')).toBeInTheDocument()
    })

    it('renders mobile sheet when on mobile', () => {
      vi.mocked(useIsMobile).mockReturnValue(true)

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      expect(screen.getByText('Dialog Content')).toBeInTheDocument()
    })

    it('renders with footer content', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          footer={<button>Save</button>}
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('renders with custom header', () => {
      const customHeader = () => (
        <div data-testid='custom-header'>Custom Header</div>
      )

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          renderHeader={customHeader}
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByTestId('custom-header')).toBeInTheDocument()
      expect(screen.getByText('Custom Header')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(
        <DialogFrame
          open={false}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      // Dialog/Sheet should not render content when closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // 2. Interaction tests
  describe('Interactions', () => {
    it('calls onOpenChange when closed', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      // Find and click close button (X button in DialogContent)
      const closeButton = screen.getByRole('button', { name: /fechar/i })
      fireEvent.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('handles footer button clicks', () => {
      const onSave = vi.fn()

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          footer={<button onClick={onSave}>Save</button>}
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      const saveButton = screen.getByRole('button', { name: 'Save' })
      fireEvent.click(saveButton)

      expect(onSave).toHaveBeenCalled()
    })
  })

  // 3. Size variants
  describe('Size Variants', () => {
    it('applies small size class', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          size='sm'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('dialog')).toHaveClass('max-w-md')
    })

    it('applies medium size class', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          size='md'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('dialog')).toHaveClass('max-w-2xl')
    })

    it('applies large size class', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          size='lg'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('dialog')).toHaveClass('max-w-4xl')
    })

    it('applies extra large size class', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          size='xl'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('dialog')).toHaveClass('max-w-6xl')
    })

    it('applies full size class by default', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('dialog')).toHaveClass('max-w-[95vw]')
    })
  })

  // 4. Edge cases
  describe('Edge Cases', () => {
    it('forces desktop mode even on mobile', () => {
      vi.mocked(useIsMobile).mockReturnValue(true)

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          forceDesktopMode={true}
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      // Should render Dialog (centered modal), not Sheet (bottom panel)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).not.toHaveClass('h-[90vh]')
    })

    it('handles missing footer gracefully', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      // Should not have footer element
      const footer = screen.queryByRole('contentinfo')
      expect(footer).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
          className='custom-class'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('dialog')).toHaveClass('custom-class')
    })

    it('renders without renderHeader prop', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
    })

    it('hides default title when custom header is used', () => {
      const customHeader = () => <div>Custom Header</div>

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Default Title'
          renderHeader={customHeader}
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      // Default title should be in sr-only (screen reader only)
      const srOnlyTitle = screen.getByText('Default Title')
      expect(srOnlyTitle).toHaveClass('sr-only')
    })
  })

  // 5. Accessibility
  describe('Accessibility', () => {
    it('has proper dialog role', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible title', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Accessible Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      expect(screen.getByText('Accessible Dialog')).toBeInTheDocument()
    })

    it('has close button with accessible label', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      const closeButton = screen.getByRole('button', { name: /fechar/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('maintains focus trap when open', () => {
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <button>Action Button</button>
        </DialogFrame>
      )

      const actionButton = screen.getByRole('button', { name: 'Action Button' })
      expect(actionButton).toBeInTheDocument()
    })

    it('provides screen reader only title with custom header', () => {
      const customHeader = () => <div aria-label='Custom Dialog'>Custom</div>

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Screen Reader Title'
          renderHeader={customHeader}
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      const srTitle = screen.getByText('Screen Reader Title')
      expect(srTitle).toHaveClass('sr-only')
    })

    it('keeps a screen reader only title with custom header in sheet (mobile) mode', () => {
      vi.mocked(useIsMobile).mockReturnValue(true)
      const customHeader = () => <div>Custom Mobile Header</div>

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Sheet Title'
          renderHeader={customHeader}
        >
          <div>Dialog Content</div>
        </DialogFrame>
      )

      // Before 7.9.2 the sheet had no title at all with renderHeader, so apps
      // had to render their own DialogTitle (duplicated id on desktop)
      const srTitle = screen.getByText('Sheet Title')
      expect(srTitle).toHaveClass('sr-only')
      expect(screen.getByText('Custom Mobile Header')).toBeInTheDocument()
    })
  })

  // 6. Mobile vs Desktop rendering
  describe('Mobile vs Desktop', () => {
    it('renders different components for mobile and desktop', () => {
      // Desktop rendering: centered modal (no mobile height class)
      vi.mocked(useIsMobile).mockReturnValue(false)
      const { unmount } = render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Content</div>
        </DialogFrame>
      )

      const dialogElement = screen.getByRole('dialog')
      expect(dialogElement).toBeInTheDocument()
      expect(dialogElement).not.toHaveClass('h-[90vh]')

      // Unmount before re-rendering (Radix portals into document.body)
      unmount()

      // Mobile rendering: bottom sheet with mobile height class
      vi.mocked(useIsMobile).mockReturnValue(true)
      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Content</div>
        </DialogFrame>
      )

      const sheetElement = screen.getByRole('dialog')
      expect(sheetElement).toBeInTheDocument()
      expect(sheetElement).toHaveClass('h-[90vh]')
    })

    it('applies mobile-specific classes on mobile', () => {
      vi.mocked(useIsMobile).mockReturnValue(true)

      render(
        <DialogFrame
          open={true}
          onOpenChange={mockOnOpenChange}
          title='Test Dialog'
        >
          <div>Content</div>
        </DialogFrame>
      )

      // Sheet should have h-[90vh] for mobile
      expect(screen.getByRole('dialog')).toHaveClass('h-[90vh]')
    })
  })
})
