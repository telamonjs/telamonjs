import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timeline } from './Timeline'

// Mock date-fns
vi.mock('date-fns', () => import('../../test/__mocks__/date-fns'))

// Mock ui/avatar
vi.mock('../../ui/avatar', () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid='avatar' className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: any) => (
    <img data-testid='avatar-image' src={src} alt={alt} />
  ),
  AvatarFallback: ({ children, className }: any) => (
    <div data-testid='avatar-fallback' className={className}>
      {children}
    </div>
  ),
}))

describe('Timeline', () => {
  const mockItems = [
    {
      id: '1',
      title: 'Pedido criado',
      description: 'Pedido #1234 foi criado',
      timestamp: new Date('2024-01-01T10:00:00'),
      user: { name: 'João Silva', avatar: '/avatar1.jpg' },
      variant: 'success' as const,
    },
    {
      id: '2',
      title: 'Pedido processado',
      description: 'Pedido foi processado com sucesso',
      timestamp: new Date('2024-01-01T11:00:00'),
      user: { name: 'Maria Santos', avatar: '/avatar2.jpg' },
      variant: 'default' as const,
    },
  ]

  describe('Rendering - Vertical', () => {
    it('renders with required props', () => {
      render(<Timeline items={mockItems} />)

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
      expect(screen.getByText('Pedido processado')).toBeInTheDocument()
    })

    it('renders all item descriptions', () => {
      render(<Timeline items={mockItems} />)

      expect(screen.getByText('Pedido #1234 foi criado')).toBeInTheDocument()
      expect(
        screen.getByText('Pedido foi processado com sucesso')
      ).toBeInTheDocument()
    })

    it('renders user information', () => {
      render(<Timeline items={mockItems} />)

      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    })

    it('renders user avatars', () => {
      render(<Timeline items={mockItems} />)

      const avatars = screen.getAllByTestId('avatar')
      expect(avatars.length).toBeGreaterThan(0)
    })

    it('renders timestamps', () => {
      render(<Timeline items={mockItems} />)

      // Mock formatDistanceToNow returns relative time
      const timeElements = screen.getAllByText(/há/)
      expect(timeElements.length).toBeGreaterThan(0)
    })
  })

  describe('Rendering - Horizontal', () => {
    it('renders horizontal variant', () => {
      const { container } = render(
        <Timeline items={mockItems} variant='horizontal' />
      )

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('renders success variant', () => {
      render(<Timeline items={[{ ...mockItems[0], variant: 'success' }]} />)

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
    })

    it('renders warning variant', () => {
      render(<Timeline items={[{ ...mockItems[0], variant: 'warning' }]} />)

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
    })

    it('renders error variant', () => {
      render(<Timeline items={[{ ...mockItems[0], variant: 'error' }]} />)

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty items array', () => {
      const { container } = render(<Timeline items={[]} />)

      expect(container.querySelector('.space-y-4')).toBeInTheDocument()
    })

    it('handles single item', () => {
      render(<Timeline items={[mockItems[0]]} />)

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
    })

    it('handles items without user', () => {
      render(<Timeline items={[{ ...mockItems[0], user: undefined }]} />)

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
    })

    it('handles items without description', () => {
      render(
        <Timeline items={[{ ...mockItems[0], description: undefined }]} />
      )

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
    })

    it('renders custom icon', () => {
      render(
        <Timeline
          items={[
            {
              ...mockItems[0],
              icon: <div data-testid='custom-icon'>✓</div>,
            },
          ]}
        />
      )

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('hides connector when showConnector is false', () => {
      render(<Timeline items={mockItems} showConnector={false} />)

      expect(screen.getByText('Pedido criado')).toBeInTheDocument()
    })
  })
})
