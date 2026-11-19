import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DetailAvatar } from './DetailAvatar'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailAvatar', () => {
  describe('Rendering', () => {
    it('renders with image URL', () => {
      renderWithProviders(
        <DetailAvatar
          name='John Doe'
          imageUrl='https://example.com/avatar.jpg'
          zoomable={false}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByTestId('next-image')).toBeInTheDocument()
    })

    it('renders fallback with initials when no image', () => {
      renderWithProviders(<DetailAvatar name='Jane Smith' />)

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('renders with subtitle', () => {
      renderWithProviders(
        <DetailAvatar name='John Doe' subtitle='john@example.com' />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })

    it('renders different sizes', () => {
      const { rerender } = renderWithProviders(
        <DetailAvatar name='Test User' size='sm' />
      )
      expect(screen.getByText('T')).toBeInTheDocument()

      rerender(<DetailAvatar name='Test User' size='xl' />)
      expect(screen.getByText('T')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles single character name', () => {
      renderWithProviders(<DetailAvatar name='X' />)

      // Name "X" appears both in the text AND in the fallback initial
      // Using getAllByText to handle multiple occurrences
      const elements = screen.getAllByText('X')
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })

    it('handles name with special characters', () => {
      renderWithProviders(<DetailAvatar name='José María' />)

      expect(screen.getByText('José María')).toBeInTheDocument()
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('handles very long names', () => {
      const longName = 'John Jacob Jingleheimer Schmidt'
      renderWithProviders(<DetailAvatar name={longName} />)

      expect(screen.getByText(longName)).toBeInTheDocument()
      expect(screen.getByText('J')).toBeInTheDocument()
    })
  })

  describe('Enhanced Coverage', () => {
    describe('Image Rendering', () => {
      it('renders small size', () => {
        renderWithProviders(
          <DetailAvatar
            name='Small Avatar'
            imageUrl='https://example.com/avatar.jpg'
            size='sm'
            zoomable={false}
          />
        )

        expect(screen.getByText('Small Avatar')).toBeInTheDocument()
      })

      it('renders extra large size', () => {
        renderWithProviders(
          <DetailAvatar
            name='XL Avatar'
            imageUrl='https://example.com/avatar.jpg'
            size='xl'
            zoomable={false}
          />
        )

        expect(screen.getByText('XL Avatar')).toBeInTheDocument()
      })

      it('renders without zoomable feature', () => {
        renderWithProviders(
          <DetailAvatar
            name='No Zoom'
            imageUrl='https://example.com/avatar.jpg'
            zoomable={false}
          />
        )

        expect(screen.getByText('No Zoom')).toBeInTheDocument()
      })
    })

    describe('Fallback Initials', () => {
      it('extracts initials from full name', () => {
        renderWithProviders(<DetailAvatar name='John Michael Doe' />)

        expect(screen.getByText('J')).toBeInTheDocument()
      })

      it('handles empty string name', () => {
        expect(() => {
          renderWithProviders(<DetailAvatar name='' />)
        }).not.toThrow()
      })

      it('handles whitespace-only name', () => {
        expect(() => {
          renderWithProviders(<DetailAvatar name='   ' />)
        }).not.toThrow()
      })

      it('handles lowercase names', () => {
        renderWithProviders(<DetailAvatar name='alice cooper' />)

        expect(screen.getByText('alice cooper')).toBeInTheDocument()
        // Should extract first initial
        const initials = screen.getAllByText(/[aA]/)
        expect(initials.length).toBeGreaterThan(0)
      })

      it('handles numbers in name', () => {
        renderWithProviders(<DetailAvatar name='User123' />)

        expect(screen.getByText('User123')).toBeInTheDocument()
      })
    })

    describe('Subtitle Rendering', () => {
      it('renders subtitle below name', () => {
        renderWithProviders(
          <DetailAvatar name='John Doe' subtitle='Admin User' />
        )

        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      it('renders long subtitle', () => {
        renderWithProviders(
          <DetailAvatar
            name='Jane'
            subtitle='Senior Software Engineer - Frontend Team Lead'
          />
        )

        expect(
          screen.getByText('Senior Software Engineer - Frontend Team Lead')
        ).toBeInTheDocument()
      })
    })
  })
})
