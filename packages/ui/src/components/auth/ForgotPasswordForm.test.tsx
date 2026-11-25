/**
 * ForgotPasswordForm against the REAL Button/Input/Label primitives.
 */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { ForgotPasswordForm } from './ForgotPasswordForm'

expect.extend(axeMatchers)

vi.unmock('../../ui/button')
vi.unmock('../../ui/input')
vi.unmock('../../ui/label')
vi.unmock('@radix-ui/react-label')
vi.unmock('@radix-ui/react-slot')

async function submit(email: string) {
  const user = userEvent.setup()
  if (email) await user.type(screen.getByLabelText('E-mail'), email)
  await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
  return user
}

describe('ForgotPasswordForm', () => {
  describe('Rendering', () => {
    it('renders a localized email field and submit button', () => {
      render(<ForgotPasswordForm onSubmit={vi.fn()} />)
      const email = screen.getByLabelText('E-mail')
      expect(email).toHaveAttribute('type', 'email')
      expect(email).toHaveAttribute('autocomplete', 'email')
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('takes emailPlaceholder, autoFocus and submitClassName', () => {
      render(<ForgotPasswordForm onSubmit={vi.fn()} emailPlaceholder='you@example.com' autoFocus submitClassName='h-12' />)
      const email = screen.getByLabelText('E-mail')
      expect(email).toHaveAttribute('placeholder', 'you@example.com')
      expect(email).toHaveFocus()
      expect(screen.getByRole('button').className).toContain('h-12')
    })

    it('accepts an onSubmit that resolves a value (e.g. a server action result)', async () => {
      const onSubmit = async (_email: string) => ({ success: true })
      render(<ForgotPasswordForm onSubmit={onSubmit} />)
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    })

    it('renders the back-to-sign-in link only with signInHref', () => {
      render(<ForgotPasswordForm onSubmit={vi.fn()} signInHref='/sign-in' />)
      expect(screen.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute('href', '/sign-in')
    })
  })

  describe('Interactions', () => {
    it('calls onSubmit with the trimmed email, then shows the neutral success message', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<ForgotPasswordForm onSubmit={onSubmit} signInHref='/sign-in' />)
      await submit('  ana@example.com ')
      expect(await screen.findByRole('status')).toHaveTextContent('Se o e-mail estiver cadastrado')
      expect(onSubmit).toHaveBeenCalledWith('ana@example.com')
      expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Voltar para o login' })).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('validates required and email format before calling onSubmit', async () => {
      const onSubmit = vi.fn()
      render(<ForgotPasswordForm onSubmit={onSubmit} />)
      const user = await submit('')
      expect(await screen.findByText('Campo obrigatório')).toBeInTheDocument()
      await user.type(screen.getByLabelText('E-mail'), 'nope')
      await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
      expect(await screen.findByText('E-mail inválido')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('is pending while onSubmit runs', async () => {
      let resolve!: () => void
      render(<ForgotPasswordForm onSubmit={() => new Promise<void>((r) => (resolve = r))} />)
      await submit('ana@example.com')
      const button = await screen.findByRole('button', { name: /Enviando/ })
      expect(button).toBeDisabled()
      expect(screen.getByLabelText('E-mail')).toBeDisabled()
      await act(async () => resolve())
      expect(await screen.findByRole('status')).toBeInTheDocument()
    })

    it('a rejection shows a generic error (never the backend text) and keeps the form', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('No account for ana@example.com'))
      render(<ForgotPasswordForm onSubmit={onSubmit} />)
      await submit('ana@example.com')
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Não foi possível enviar o link')
      expect(alert).not.toHaveTextContent('No account')
      expect(screen.getByLabelText('E-mail')).toBeEnabled()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations in the form, error and success states', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      const { container } = render(<ForgotPasswordForm onSubmit={onSubmit} signInHref='/sign-in' />)
      expect(await axe(container)).toHaveNoViolations()
      const user = await submit('')
      await screen.findByText('Campo obrigatório')
      expect(await axe(container)).toHaveNoViolations()
      await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
      await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
      await screen.findByRole('status')
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
