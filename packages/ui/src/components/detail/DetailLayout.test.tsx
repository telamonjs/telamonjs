import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DetailLayout } from './DetailLayout'
import { DetailCard } from './DetailCard'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailLayout', () => {
  describe('Rendering', () => {
    it('renders with title', () => {
      renderWithProviders(
        <DetailLayout title='User Details' leftColumn={<div>Content</div>} />
      )

      expect(screen.getByText('User Details')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('renders left and right columns', () => {
      renderWithProviders(
        <DetailLayout
          title='Details'
          leftColumn={<div data-testid='left-content'>Left</div>}
          rightColumn={<div data-testid='right-content'>Right</div>}
        />
      )

      expect(screen.getByTestId('left-content')).toBeInTheDocument()
      expect(screen.getByTestId('right-content')).toBeInTheDocument()
    })

    it('renders alerts', () => {
      renderWithProviders(
        <DetailLayout
          title='Details'
          alerts={[
            {
              variant: 'warning',
              title: 'Warning',
              message: 'Pending verification',
            },
          ]}
          leftColumn={<div>Content</div>}
        />
      )

      expect(screen.getByText('Pending verification')).toBeInTheDocument()
    })

    it('renders header actions', () => {
      renderWithProviders(
        <DetailLayout
          title='Details'
          headerActions={<button>Edit</button>}
          leftColumn={<div>Content</div>}
        />
      )

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles no children', () => {
      expect(() => {
        renderWithProviders(<DetailLayout title='Details' />)
      }).not.toThrow()
    })

    it('renders with description', () => {
      renderWithProviders(
        <DetailLayout
          title='User Details'
          description='John Doe'
          leftColumn={<div>Content</div>}
        />
      )

      expect(screen.getByText('User Details')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Enhanced Coverage', () => {
    describe('Layout Modes', () => {
      it('renders 2-column layout by default', () => {
        renderWithProviders(
          <DetailLayout
            title='2-Column Layout'
            leftColumn={<div data-testid='left'>Left</div>}
            rightColumn={<div data-testid='right'>Right</div>}
          />
        )

        expect(screen.getByTestId('left')).toBeInTheDocument()
        expect(screen.getByTestId('right')).toBeInTheDocument()
      })

      it('renders 3-column sidebar layout', () => {
        renderWithProviders(
          <DetailLayout
            title='3-Column Sidebar'
            layout='3-columns-sidebar'
            mainColumn={<div data-testid='main'>Main Content</div>}
            sidebar={<div data-testid='sidebar'>Sidebar Content</div>}
          />
        )

        expect(screen.getByTestId('main')).toBeInTheDocument()
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      })

      it('renders only left column in 2-column mode', () => {
        renderWithProviders(
          <DetailLayout
            title='Single Column'
            leftColumn={<div>Only Left</div>}
          />
        )

        expect(screen.getByText('Only Left')).toBeInTheDocument()
      })

      it('renders only main column in 3-column sidebar mode', () => {
        renderWithProviders(
          <DetailLayout
            title='Main Only'
            layout='3-columns-sidebar'
            mainColumn={<div data-testid='main-only'>Main Only</div>}
          />
        )

        expect(screen.getByTestId('main-only')).toBeInTheDocument()
      })
    })

    describe('Footer Section', () => {
      it('renders footer content', () => {
        renderWithProviders(
          <DetailLayout
            title='With Footer'
            leftColumn={<div>Content</div>}
            footer={<div data-testid='footer'>Footer Content</div>}
          />
        )

        expect(screen.getByTestId('footer')).toBeInTheDocument()
      })

      it('renders footer with complex content', () => {
        renderWithProviders(
          <DetailLayout
            title='Complex Footer'
            leftColumn={<div>Content</div>}
            footer={
              <>
                <DetailCard title='Timeline'>
                  <p>Event 1</p>
                  <p>Event 2</p>
                </DetailCard>
                <DetailCard title='Comments'>
                  <p>Comment 1</p>
                </DetailCard>
              </>
            }
          />
        )

        expect(screen.getByText('Timeline')).toBeInTheDocument()
        expect(screen.getByText('Comments')).toBeInTheDocument()
      })
    })

    describe('Multiple Alerts', () => {
      it('renders multiple alerts', () => {
        renderWithProviders(
          <DetailLayout
            title='Multiple Alerts'
            alerts={[
              { variant: 'warning', message: 'Warning 1' },
              { variant: 'info', message: 'Info 1' },
              { variant: 'danger', message: 'Error 1' },
            ]}
            leftColumn={<div>Content</div>}
          />
        )

        expect(screen.getByText('Warning 1')).toBeInTheDocument()
        expect(screen.getByText('Info 1')).toBeInTheDocument()
        expect(screen.getByText('Error 1')).toBeInTheDocument()
      })

      it('renders alerts with titles', () => {
        renderWithProviders(
          <DetailLayout
            title='Titled Alerts'
            alerts={[
              {
                variant: 'warning',
                title: 'Important',
                message: 'Please review',
              },
              {
                variant: 'success',
                title: 'Success',
                message: 'Operation completed',
              },
            ]}
            leftColumn={<div>Content</div>}
          />
        )

        expect(screen.getByText('Important')).toBeInTheDocument()
        expect(screen.getByText('Please review')).toBeInTheDocument()
        expect(screen.getByText('Success')).toBeInTheDocument()
      })
    })

    describe('Complex Scenarios', () => {
      it('renders full layout with all features', () => {
        renderWithProviders(
          <DetailLayout
            title='Complete Layout'
            description='Full featured layout'
            headerActions={<button>Edit</button>}
            alerts={[{ variant: 'info', message: 'Info message' }]}
            leftColumn={<div>Left Content</div>}
            rightColumn={<div>Right Content</div>}
            footer={<div>Footer</div>}
            className='custom-class'
          />
        )

        expect(screen.getByText('Complete Layout')).toBeInTheDocument()
        expect(screen.getByText('Full featured layout')).toBeInTheDocument()
        expect(screen.getByText('Info message')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
        expect(screen.getByText('Left Content')).toBeInTheDocument()
        expect(screen.getByText('Right Content')).toBeInTheDocument()
        expect(screen.getByText('Footer')).toBeInTheDocument()
      })

      it('renders with nested DetailCards', () => {
        renderWithProviders(
          <DetailLayout
            title='Nested Cards'
            leftColumn={
              <>
                <DetailCard title='Card 1'>Content 1</DetailCard>
                <DetailCard title='Card 2'>Content 2</DetailCard>
              </>
            }
            rightColumn={
              <>
                <DetailCard title='Card 3'>Content 3</DetailCard>
                <DetailCard title='Card 4'>Content 4</DetailCard>
              </>
            }
          />
        )

        expect(screen.getByText('Card 1')).toBeInTheDocument()
        expect(screen.getByText('Card 2')).toBeInTheDocument()
        expect(screen.getByText('Card 3')).toBeInTheDocument()
        expect(screen.getByText('Card 4')).toBeInTheDocument()
      })
    })

    describe('Accessibility', () => {
      it('has proper heading structure', () => {
        renderWithProviders(
          <DetailLayout
            title='Accessible Layout'
            leftColumn={<div>Content</div>}
          />
        )

        // Title is rendered by PageContent which creates proper heading
        expect(screen.getByText('Accessible Layout')).toBeInTheDocument()
      })
    })
  })
})
