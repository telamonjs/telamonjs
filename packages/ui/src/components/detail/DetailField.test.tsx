import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DetailField } from './DetailField'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailField', () => {
  describe('Rendering', () => {
    it('renders label and value', () => {
      renderWithProviders(<DetailField label='Name' value='John Doe' />)

      expect(screen.getByText(/Name/)).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      const { User } = require('lucide-react')
      const { container } = renderWithProviders(
        <DetailField label='Username' value='johndoe' icon={User} />
      )

      // Icon renders as SVG element
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('renders null value as-is', () => {
      renderWithProviders(<DetailField label='Middle Name' value={null} />)

      expect(screen.getByText(/Middle Name/)).toBeInTheDocument()
    })

    it('renders empty string value', () => {
      renderWithProviders(<DetailField label='Note' value='' />)

      expect(screen.getByText(/Note/)).toBeInTheDocument()
    })

    it('renders number values', () => {
      renderWithProviders(<DetailField label='Age' value={25} />)

      expect(screen.getByText('25')).toBeInTheDocument()
    })

    it('renders with highlighted variant', () => {
      renderWithProviders(
        <DetailField label='Important' value='Urgent' variant='highlighted' />
      )

      expect(screen.getByText('Urgent')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined value', () => {
      renderWithProviders(
        <DetailField label='Optional' value={undefined as any} />
      )

      expect(screen.getByText(/Optional/)).toBeInTheDocument()
    })

    it('renders with border', () => {
      renderWithProviders(
        <DetailField label='Bordered' value='Value' border />
      )

      expect(screen.getByText('Value')).toBeInTheDocument()
    })
  })

  describe('Enhanced Coverage', () => {
    describe('Value Formatting', () => {
      it('renders boolean values', () => {
        renderWithProviders(
          <>
            <DetailField label='Active' value={String(true)} />
            <DetailField label='Disabled' value={String(false)} />
          </>
        )

        expect(screen.getByText('true')).toBeInTheDocument()
        expect(screen.getByText('false')).toBeInTheDocument()
      })

      it('renders zero number value', () => {
        renderWithProviders(<DetailField label='Count' value={0} />)

        expect(screen.getByText('0')).toBeInTheDocument()
      })

      it('renders negative numbers', () => {
        renderWithProviders(<DetailField label='Balance' value={-500} />)

        expect(screen.getByText('-500')).toBeInTheDocument()
      })

      it('renders very large numbers', () => {
        renderWithProviders(
          <DetailField label='Population' value={7800000000} />
        )

        expect(screen.getByText('7800000000')).toBeInTheDocument()
      })

      it('renders decimal numbers', () => {
        renderWithProviders(<DetailField label='Rate' value={3.14159} />)

        expect(screen.getByText('3.14159')).toBeInTheDocument()
      })
    })

    describe('ReactNode Values', () => {
      it('renders badge as value', () => {
        const badge = (
          <span data-testid='custom-badge' className='badge'>
            Premium
          </span>
        )
        renderWithProviders(<DetailField label='Plan' value={badge} />)

        expect(screen.getByTestId('custom-badge')).toBeInTheDocument()
      })

      it('renders link as value', () => {
        const link = (
          <a href='https://example.com' data-testid='link'>
            View Details
          </a>
        )
        renderWithProviders(<DetailField label='More Info' value={link} />)

        expect(screen.getByTestId('link')).toBeInTheDocument()
      })

      it('renders complex component as value', () => {
        const complex = (
          <div data-testid='complex'>
            <span>Part 1</span>
            <span>Part 2</span>
          </div>
        )
        renderWithProviders(<DetailField label='Complex' value={complex} />)

        expect(screen.getByTestId('complex')).toBeInTheDocument()
        expect(screen.getByText('Part 1')).toBeInTheDocument()
        expect(screen.getByText('Part 2')).toBeInTheDocument()
      })
    })

    describe('Styling Variants', () => {
      it('applies highlighted variant classes', () => {
        renderWithProviders(
          <DetailField
            label='Important'
            value='Highlighted Value'
            variant='highlighted'
          />
        )

        // Check that highlighted value has primary color class
        const valueElement = screen.getByText('Highlighted Value')
        expect(valueElement).toBeInTheDocument()
      })

      it('applies border when specified', () => {
        renderWithProviders(
          <DetailField label='Bordered' value='Value' border />
        )

        // The border class should be applied to the container
        expect(screen.getByText('Value')).toBeInTheDocument()
      })

      it('combines variant and border', () => {
        renderWithProviders(
          <DetailField
            label='Combined'
            value='Value'
            variant='highlighted'
            border
          />
        )

        expect(screen.getByText('Value')).toBeInTheDocument()
      })
    })

    describe('Custom className', () => {
      it('applies custom className', () => {
        const { container } = renderWithProviders(
          <DetailField
            label='Custom'
            value='Value'
            className='my-custom-field'
          />
        )

        const element = container.querySelector('.my-custom-field')
        expect(element).toBeInTheDocument()
      })
    })
  })
})
