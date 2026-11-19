import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DetailCard } from './DetailCard'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailCard', () => {
  describe('Rendering', () => {
    it('renders with title and icon', () => {
      const { User } = require('lucide-react')
      const { container } = renderWithProviders(
        <DetailCard title='Personal Information' icon={User}>
          <div>Content</div>
        </DetailCard>
      )

      expect(screen.getByText('Personal Information')).toBeInTheDocument()
      // Icon is rendered as SVG (check for lucide class or svg element)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders with headerBadge', () => {
      renderWithProviders(
        <DetailCard
          title='User Data'
          headerBadge={<span data-testid='badge'>Active</span>}
        >
          <div>Content</div>
        </DetailCard>
      )

      expect(screen.getByTestId('badge')).toBeInTheDocument()
    })

    it('renders fields array automatically', () => {
      renderWithProviders(
        <DetailCard
          title='Contact'
          fields={[
            { label: 'Email', value: 'user@example.com' },
            { label: 'Phone', value: '+1234567890' },
          ]}
        />
      )

      // Fields render with ":" suffix from DetailField component
      expect(screen.getByText(/Email/)).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
      expect(screen.getByText(/Phone/)).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
    })

    it('renders custom children', () => {
      renderWithProviders(
        <DetailCard title='Custom'>
          <div data-testid='custom-content'>Custom Content</div>
        </DetailCard>
      )

      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty fields array', () => {
      expect(() => {
        renderWithProviders(<DetailCard title='Empty' fields={[]} />)
      }).not.toThrow()
    })

    it('handles null icon gracefully', () => {
      expect(() => {
        renderWithProviders(
          <DetailCard title='No Icon'>
            <div>Content</div>
          </DetailCard>
        )
      }).not.toThrow()
    })
  })

  describe('Enhanced Coverage', () => {
    describe('Header Variants', () => {
      it('renders without header when no title, icon, or badge', () => {
        renderWithProviders(
          <DetailCard>
            <div data-testid='content-only'>Content Only</div>
          </DetailCard>
        )

        expect(screen.getByTestId('content-only')).toBeInTheDocument()
        // Should not render CardHeader
        expect(screen.queryByTestId('card-header')).not.toBeInTheDocument()
      })

      it('renders with icon only (no title)', () => {
        const { User } = require('lucide-react')
        renderWithProviders(
          <DetailCard icon={User}>
            <div>Content</div>
          </DetailCard>
        )

        // Should render content without title
        expect(screen.getByText('Content')).toBeInTheDocument()
      })

      it('renders with badge only (no title)', () => {
        renderWithProviders(
          <DetailCard headerBadge={<span data-testid='badge'>New</span>}>
            <div>Content</div>
          </DetailCard>
        )

        expect(screen.getByTestId('badge')).toBeInTheDocument()
      })

      it('renders with description', () => {
        renderWithProviders(
          <DetailCard title='Main Title' description='Subtitle text'>
            <div>Content</div>
          </DetailCard>
        )

        expect(screen.getByText('Main Title')).toBeInTheDocument()
        expect(screen.getByText('Subtitle text')).toBeInTheDocument()
      })
    })

    describe('Fields Rendering', () => {
      it('renders complex field configurations', () => {
        const { User, Mail, Phone } = require('lucide-react')
        renderWithProviders(
          <DetailCard
            title='Contact Info'
            fields={[
              { label: 'Name', value: 'John Doe', icon: User },
              {
                label: 'Email',
                value: 'john@example.com',
                icon: Mail,
                border: true,
              },
              {
                label: 'Phone',
                value: '+1234567890',
                icon: Phone,
                variant: 'highlighted',
              },
            ]}
          />
        )

        expect(screen.getByText(/Name/)).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText(/Email/)).toBeInTheDocument()
        expect(screen.getByText('john@example.com')).toBeInTheDocument()
        expect(screen.getByText(/Phone/)).toBeInTheDocument()
        expect(screen.getByText('+1234567890')).toBeInTheDocument()
      })

      it('renders fields with ReactNode values', () => {
        renderWithProviders(
          <DetailCard
            title='Custom Values'
            fields={[
              {
                label: 'Status',
                value: <span data-testid='status-badge'>Active</span>,
              },
              {
                label: 'Progress',
                value: <div data-testid='progress-bar'>75%</div>,
              },
            ]}
          />
        )

        expect(screen.getByTestId('status-badge')).toBeInTheDocument()
        expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
      })

      it('renders many fields (10+)', () => {
        const fields = Array.from({ length: 15 }, (_, i) => ({
          label: `Field ${i + 1}`,
          value: `Value ${i + 1}`,
        }))

        renderWithProviders(<DetailCard title='Many Fields' fields={fields} />)

        expect(screen.getAllByText(/Field 1/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/Field 15/).length).toBeGreaterThan(0)
      })
    })

    describe('Edge Cases', () => {
      it('handles null value in fields', () => {
        renderWithProviders(
          <DetailCard
            title='Null Values'
            fields={[
              { label: 'Optional', value: null },
              { label: 'Another', value: 'Has value' },
            ]}
          />
        )

        expect(screen.getByText(/Optional/)).toBeInTheDocument()
        expect(screen.getByText('Has value')).toBeInTheDocument()
      })

      it('handles undefined value in fields', () => {
        renderWithProviders(
          <DetailCard
            title='Undefined Values'
            fields={[{ label: 'Optional', value: undefined as any }]}
          />
        )

        expect(screen.getByText(/Optional/)).toBeInTheDocument()
      })

      it('renders with custom className', () => {
        const { container } = renderWithProviders(
          <DetailCard title='Custom Class' className='my-custom-class'>
            <div>Content</div>
          </DetailCard>
        )

        const card = container.querySelector('.my-custom-class')
        expect(card).toBeInTheDocument()
      })
    })
  })
})
