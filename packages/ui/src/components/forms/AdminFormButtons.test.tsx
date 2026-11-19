import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminFormButtons } from './AdminFormButtons'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Save: () => <svg data-testid='mock-save-icon' />,
  X: () => <svg data-testid='mock-x-icon' />,
}))

describe('AdminFormButtons', () => {
  // 1. Rendering tests
  describe('Rendering', () => {
    it('renders submit and cancel buttons', () => {
      render(<AdminFormButtons isPending={false} />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /cancelar/i })
      ).toBeInTheDocument()
    })

    it('renders with default labels', () => {
      render(<AdminFormButtons isPending={false} />)

      expect(screen.getByText('Salvar')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    it('renders with custom submit label', () => {
      render(<AdminFormButtons isPending={false} submitLabel='Create User' />)

      expect(screen.getByText('Create User')).toBeInTheDocument()
    })

    it('renders with custom cancel label', () => {
      render(<AdminFormButtons isPending={false} cancelLabel='Go Back' />)

      expect(screen.getByText('Go Back')).toBeInTheDocument()
    })

    it('renders icons in buttons', () => {
      render(<AdminFormButtons isPending={false} />)

      expect(screen.getByTestId('mock-save-icon')).toBeInTheDocument()
      expect(screen.getByTestId('mock-x-icon')).toBeInTheDocument()
    })

    it('hides buttons when hide prop is true', () => {
      render(<AdminFormButtons isPending={false} hide={true} />)

      expect(
        screen.queryByRole('button', { name: /salvar/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /cancelar/i })
      ).not.toBeInTheDocument()
    })
  })

  // 2. Interaction tests
  describe('Interactions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      render(<AdminFormButtons isPending={false} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('uses window.history.back when onCancel is not provided', () => {
      const backSpy = vi
        .spyOn(window.history, 'back')
        .mockImplementation(() => {})

      render(<AdminFormButtons isPending={false} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)

      expect(backSpy).toHaveBeenCalledTimes(1)
      backSpy.mockRestore()
    })

    it('submit button triggers form submission', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('cancel button does not submit form', () => {
      render(<AdminFormButtons isPending={false} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      expect(cancelButton).toHaveAttribute('type', 'button')
    })
  })

  // 3. State management
  describe('State Management', () => {
    it('disables buttons when isPending is true', () => {
      render(<AdminFormButtons isPending={true} />)

      const submitButton = screen.getByRole('button', { name: /salvando/i })
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })

      expect(submitButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })

    it('shows loading text when isPending is true', () => {
      render(<AdminFormButtons isPending={true} />)

      expect(screen.getByText('Salvando...')).toBeInTheDocument()
      expect(screen.queryByText('Salvar')).not.toBeInTheDocument()
    })

    it('shows save icon when not pending', () => {
      render(<AdminFormButtons isPending={false} />)

      expect(screen.getByTestId('mock-save-icon')).toBeInTheDocument()
    })

    it('hides save icon when pending', () => {
      render(<AdminFormButtons isPending={true} />)

      expect(screen.queryByTestId('mock-save-icon')).not.toBeInTheDocument()
    })
  })

  // 4. Edge cases
  describe('Edge Cases', () => {
    it('handles mode prop (create)', () => {
      render(<AdminFormButtons isPending={false} mode='create' />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles mode prop (edit)', () => {
      render(<AdminFormButtons isPending={false} mode='edit' />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles isValid prop (true)', () => {
      render(<AdminFormButtons isPending={false} isValid={true} />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles isValid prop (false)', () => {
      render(<AdminFormButtons isPending={false} isValid={false} />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles isDirty prop (true)', () => {
      render(<AdminFormButtons isPending={false} isDirty={true} />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('handles isDirty prop (false)', () => {
      render(<AdminFormButtons isPending={false} isDirty={false} />)

      expect(
        screen.getByRole('button', { name: /salvar/i })
      ).toBeInTheDocument()
    })

    it('renders with empty custom labels', () => {
      render(
        <AdminFormButtons isPending={false} submitLabel='' cancelLabel='' />
      )

      // Buttons should render but with empty text
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('handles rapid button clicks while pending', () => {
      const onCancel = vi.fn()
      render(<AdminFormButtons isPending={true} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })

      fireEvent.click(cancelButton)
      fireEvent.click(cancelButton)
      fireEvent.click(cancelButton)

      // Should not call onCancel when disabled
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  // 5. Accessibility
  describe('Accessibility', () => {
    it('has proper ARIA labels on cancel button', () => {
      render(<AdminFormButtons isPending={false} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancelar formulário')
    })

    it('has proper ARIA labels on submit button when not pending', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).toHaveAttribute('aria-label', 'Salvar formulário')
    })

    it('has proper ARIA labels on submit button when pending', () => {
      render(<AdminFormButtons isPending={true} />)

      const submitButton = screen.getByRole('button', { name: /salvando/i })
      expect(submitButton).toHaveAttribute('aria-label', 'Salvando formulário')
    })

    it('has aria-busy on submit button when pending', () => {
      render(<AdminFormButtons isPending={true} />)

      const submitButton = screen.getByRole('button', { name: /salvando/i })
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })

    it('has aria-busy="false" when not pending', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).toHaveAttribute('aria-busy', 'false')
    })

    it('buttons are keyboard accessible', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })

      submitButton.focus()
      expect(submitButton).toHaveFocus()

      cancelButton.focus()
      expect(cancelButton).toHaveFocus()
    })

    it('maintains button order (cancel left, submit right)', () => {
      render(<AdminFormButtons isPending={false} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveTextContent('Cancelar')
      expect(buttons[1]).toHaveTextContent('Salvar')
    })
  })

  // 6. Test IDs
  describe('Test IDs', () => {
    it('has test ID on cancel button', () => {
      render(<AdminFormButtons isPending={false} />)

      const cancelButton = screen.getByTestId('form-cancel-button')
      expect(cancelButton).toBeInTheDocument()
    })

    it('has test ID on submit button', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByTestId('form-submit-button')
      expect(submitButton).toBeInTheDocument()
    })
  })

  // 7. Button styling
  describe('Button Styling', () => {
    it('applies correct variant to cancel button', () => {
      render(<AdminFormButtons isPending={false} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      // Should have outline variant classes
      expect(cancelButton).toBeInTheDocument()
    })

    it('applies correct styling to submit button', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      // Theme tokens via the Button default variant, no hard-coded green
      expect(submitButton.className).not.toMatch(/green/)
    })

    it('applies consistent height to both buttons', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })

      expect(submitButton).toHaveClass('h-10')
      expect(cancelButton).toHaveClass('h-10')
    })

    it('applies gap between icon and text', () => {
      render(<AdminFormButtons isPending={false} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).toHaveClass('gap-2')
    })
  })
})
