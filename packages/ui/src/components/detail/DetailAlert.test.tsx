import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/test-utils'
import { DetailAlert } from './DetailAlert'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailAlert', () => {
  describe('Rendering', () => {
    it('renders info variant', () => {
      renderWithProviders(
        <DetailAlert
          variant='info'
          title='Information'
          message='This is info'
        />
      )

      expect(screen.getByText('Information')).toBeInTheDocument()
      expect(screen.getByText('This is info')).toBeInTheDocument()
    })

    it('renders warning variant', () => {
      renderWithProviders(
        <DetailAlert
          variant='warning'
          title='Warning'
          message='This is a warning'
        />
      )

      expect(screen.getByText('Warning')).toBeInTheDocument()
      expect(screen.getByText('This is a warning')).toBeInTheDocument()
    })

    it('renders error variant', () => {
      renderWithProviders(
        <DetailAlert
          variant='danger'
          title='Error'
          message='This is an error'
        />
      )

      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('This is an error')).toBeInTheDocument()
    })

    it('renders success variant', () => {
      renderWithProviders(
        <DetailAlert
          variant='success'
          title='Success'
          message='Operation successful'
        />
      )

      expect(screen.getByText('Success')).toBeInTheDocument()
      expect(screen.getByText('Operation successful')).toBeInTheDocument()
    })

    it('renders dismissible alert', async () => {
      const onDismiss = vi.fn()
      const user = userEvent.setup()

      renderWithProviders(
        <DetailAlert
          variant='info'
          title='Dismissible'
          message='Can be closed'
          dismissible
          onDismiss={onDismiss}
        />
      )

      const closeButton = screen.getByLabelText('Fechar')
      await user.click(closeButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles title without message', () => {
      renderWithProviders(<DetailAlert variant='info' title='Title only' />)

      expect(screen.getByText('Title only')).toBeInTheDocument()
    })

    it('renders with custom icon', () => {
      const { AlertCircle } = require('lucide-react')
      const { container } = renderWithProviders(
        <DetailAlert variant='info' title='Custom Icon' icon={AlertCircle} />
      )

      // Icon renders as SVG
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Enhanced Coverage', () => {
    describe('Dismissible Behavior', () => {
      it('dismisses alert on close click', async () => {
        const onDismiss = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
          <DetailAlert
            variant='info'
            message='Dismissible message'
            dismissible
            onDismiss={onDismiss}
          />
        )

        const closeButton = screen.getByLabelText('Fechar')
        await user.click(closeButton)

        expect(onDismiss).toHaveBeenCalledTimes(1)
      })

      it('renders without onDismiss handler (dismissible but no callback)', () => {
        expect(() => {
          renderWithProviders(
            <DetailAlert variant='info' message='No handler' dismissible />
          )
        }).not.toThrow()

        // Alert should render even without onDismiss
        expect(screen.getByText('No handler')).toBeInTheDocument()
      })
    })

    describe('Message-Only Alerts', () => {
      it('renders without title', () => {
        renderWithProviders(
          <DetailAlert variant='info' message='Just a message' />
        )

        expect(screen.getByText('Just a message')).toBeInTheDocument()
        expect(screen.queryByTestId('alert-title')).not.toBeInTheDocument()
      })
    })

    describe('Custom Icons', () => {
      it('renders custom icon for each variant', () => {
        const {
          AlertCircle,
          AlertTriangle,
        } = require('lucide-react')

        const { container, rerender } = renderWithProviders(
          <DetailAlert
            variant='info'
            message='Info with icon'
            icon={AlertCircle}
          />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()

        rerender(
          <DetailAlert
            variant='warning'
            message='Warning with icon'
            icon={AlertTriangle}
          />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()
      })
    })

    describe('Long Messages', () => {
      it('handles very long messages', () => {
        const longMessage =
          'This is a very long message that should wrap correctly in the alert component and maintain proper formatting across multiple lines without breaking the layout or causing overflow issues.'

        renderWithProviders(
          <DetailAlert variant='info' message={longMessage} />
        )

        expect(screen.getByText(longMessage)).toBeInTheDocument()
      })
    })
  })
})
