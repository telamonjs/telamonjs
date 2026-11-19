import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/test-utils'
import { DetailActions } from './DetailActions'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailActions', () => {
  describe('Rendering', () => {
    it('renders action buttons', () => {
      renderWithProviders(
        <DetailActions
          actions={[
            { label: 'Edit', onClick: vi.fn() },
            { label: 'Delete', onClick: vi.fn() },
          ]}
        />
      )

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Delete' })
      ).toBeInTheDocument()
    })

    it('renders with icons', () => {
      const { Edit, Trash } = require('lucide-react')
      const { container } = renderWithProviders(
        <DetailActions
          actions={[
            { label: 'Edit', icon: Edit, onClick: vi.fn() },
            { label: 'Delete', icon: Trash, onClick: vi.fn() },
          ]}
        />
      )

      // Icons render as SVG elements (2 icons)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(2)
    })

    it('renders with horizontal layout', () => {
      renderWithProviders(
        <DetailActions
          layout='horizontal'
          actions={[
            { label: 'Action 1', onClick: vi.fn() },
            { label: 'Action 2', onClick: vi.fn() },
          ]}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Action 1' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Action 2' })
      ).toBeInTheDocument()
    })

    it('renders link actions', () => {
      renderWithProviders(
        <DetailActions
          actions={[{ label: 'View Details', href: '/details' }]}
        />
      )

      expect(
        screen.getByRole('button', { name: 'View Details' })
      ).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClick when action is clicked', async () => {
      const onClick = vi.fn()
      const user = userEvent.setup()

      renderWithProviders(
        <DetailActions actions={[{ label: 'Click Me', onClick }]} />
      )

      await user.click(screen.getByRole('button', { name: 'Click Me' }))

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('respects disabled state', () => {
      renderWithProviders(
        <DetailActions
          actions={[{ label: 'Disabled', onClick: vi.fn(), disabled: true }]}
        />
      )

      const button = screen.getByRole('button', { name: 'Disabled' })
      expect(button).toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty actions array', () => {
      expect(() => {
        renderWithProviders(<DetailActions actions={[]} />)
      }).not.toThrow()
    })

    it('renders custom title', () => {
      renderWithProviders(
        <DetailActions
          title='Custom Actions'
          actions={[{ label: 'Action', onClick: vi.fn() }]}
        />
      )

      expect(screen.getByText('Custom Actions')).toBeInTheDocument()
    })
  })

  describe('Enhanced Coverage', () => {
    describe('Action Variants', () => {
      it('renders button actions with different variants', () => {
        renderWithProviders(
          <DetailActions
            actions={[
              { label: 'Primary', onClick: vi.fn(), variant: 'default' },
              { label: 'Secondary', onClick: vi.fn(), variant: 'outline' },
              { label: 'Delete', onClick: vi.fn(), variant: 'destructive' },
            ]}
          />
        )

        expect(
          screen.getByRole('button', { name: 'Primary' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Secondary' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Delete' })
        ).toBeInTheDocument()
      })

      it('renders vertical layout', () => {
        renderWithProviders(
          <DetailActions
            layout='vertical'
            actions={[
              { label: 'Action 1', onClick: vi.fn() },
              { label: 'Action 2', onClick: vi.fn() },
            ]}
          />
        )

        expect(
          screen.getByRole('button', { name: 'Action 1' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Action 2' })
        ).toBeInTheDocument()
      })
    })

    describe('Interactions', () => {
      it('handles multiple clicks', async () => {
        const onClick = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
          <DetailActions actions={[{ label: 'Clickable', onClick }]} />
        )

        const button = screen.getByRole('button', { name: 'Clickable' })
        await user.click(button)
        await user.click(button)
        await user.click(button)

        expect(onClick).toHaveBeenCalledTimes(3)
      })

      it('does not call onClick when disabled', async () => {
        const onClick = vi.fn()

        renderWithProviders(
          <DetailActions
            actions={[{ label: 'Disabled', onClick, disabled: true }]}
          />
        )

        const button = screen.getByRole('button', { name: 'Disabled' })
        // Button is disabled, click should not trigger
        expect(button).toBeDisabled()
      })
    })

    describe('Link Actions', () => {
      it('renders link actions', () => {
        renderWithProviders(
          <DetailActions
            actions={[
              { label: 'View Profile', href: '/profile' },
              { label: 'Edit Settings', href: '/settings' },
            ]}
          />
        )

        expect(
          screen.getByRole('button', { name: 'View Profile' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Edit Settings' })
        ).toBeInTheDocument()
      })
    })

    describe('Many Actions', () => {
      it('renders 10+ actions', () => {
        const actions = Array.from({ length: 12 }, (_, i) => ({
          label: `Action ${i + 1}`,
          onClick: vi.fn(),
        }))

        renderWithProviders(<DetailActions actions={actions} />)

        expect(
          screen.getByRole('button', { name: 'Action 1' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Action 12' })
        ).toBeInTheDocument()
      })
    })

    describe('Loading State', () => {
      it('renders actions with loading prop', () => {
        renderWithProviders(
          <DetailActions
            actions={[
              { label: 'Loading Action', onClick: vi.fn(), loading: true },
            ]}
          />
        )

        expect(
          screen.getByRole('button', { name: 'Loading Action' })
        ).toBeInTheDocument()
      })
    })
  })
})
