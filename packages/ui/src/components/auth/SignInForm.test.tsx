/**
 * SignInForm against the REAL Button/Input/Label primitives; next-auth's
 * signIn and the Next router are the only mocks.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { msg } from '../../i18n/msg'
import { SignInForm } from './SignInForm'

expect.extend(axeMatchers)

vi.unmock('../../ui/button')
vi.unmock('../../ui/input')
vi.unmock('../../ui/label')
vi.unmock('@radix-ui/react-label')
vi.unmock('@radix-ui/react-slot')

const { signIn, push, refresh } = vi.hoisted(() => ({
  signIn: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('next-auth/react', () => ({ signIn }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

const ok = { ok: true, error: undefined, code: undefined, status: 200, url: '/' }

function setSearch(search: string) {
  window.history.replaceState({}, '', `/sign-in${search}`)
}

async function fillAndSubmit(identifier = 'ana@example.com', password = 'secret') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('E-mail'), identifier)
  await user.type(screen.getByLabelText('Senha'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  return user
}

beforeEach(() => {
  signIn.mockResolvedValue(ok)
  setSearch('')
})
afterEach(() => setSearch(''))

describe('SignInForm', () => {
  describe('Rendering', () => {
    it('renders localized identifier and password fields with login autocomplete hints', () => {
      render(<SignInForm />)
      const identifier = screen.getByLabelText('E-mail')
      expect(identifier).toHaveAttribute('type', 'email')
      expect(identifier).toHaveAttribute('autocomplete', 'username')
      const password = screen.getByLabelText('Senha')
      expect(password).toHaveAttribute('type', 'password')
      expect(password).toHaveAttribute('autocomplete', 'current-password')
      expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('type', 'submit')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('identifier label/type/placeholder are configurable; labels accept I18nText', () => {
      render(
        <SignInForm
          identifierLabel={msg('telamonjs.impersonation.userLabel')}
          identifierType='text'
          identifierPlaceholder='jdoe'
        />
      )
      const identifier = screen.getByLabelText('Usuário')
      expect(identifier).toHaveAttribute('type', 'text')
      expect(identifier).toHaveAttribute('placeholder', 'jdoe')
    })

    it('renders the forgot-password link only with forgotPasswordHref', () => {
      const { rerender } = render(<SignInForm />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      rerender(<SignInForm forgotPasswordHref='/forgot-password' />)
      expect(screen.getByRole('link', { name: 'Esqueceu a senha?' })).toHaveAttribute(
        'href',
        '/forgot-password'
      )
    })
  })

  describe('Interactions', () => {
    it('signs in with credentials and navigates to "/" by default', async () => {
      render(<SignInForm />)
      await fillAndSubmit()
      await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'ana@example.com',
        password: 'secret',
        redirect: false,
        callbackUrl: '/',
      })
      expect(refresh).toHaveBeenCalled()
    })

    it('sends the identifier under identifierName, after normalizeIdentifier', async () => {
      render(
        <SignInForm
          identifierName='login'
          identifierType='text'
          normalizeIdentifier={(v) => v.toLowerCase()}
        />
      )
      await fillAndSubmit('  JDoe ')
      await waitFor(() => expect(signIn).toHaveBeenCalled())
      expect(signIn.mock.calls[0][1]).toMatchObject({ login: 'jdoe', password: 'secret' })
      expect(signIn.mock.calls[0][1]).not.toHaveProperty('email')
    })

    it('follows a same-origin ?callbackUrl, relative or absolute', async () => {
      setSearch('?callbackUrl=%2Fadmin%2Fusers%3Fpage%3D2')
      const { unmount } = render(<SignInForm callbackUrl='/admin' />)
      await fillAndSubmit()
      await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/users?page=2'))
      unmount()

      push.mockClear()
      setSearch(`?callbackUrl=${encodeURIComponent(`${window.location.origin}/reports#top`)}`)
      render(<SignInForm />)
      await fillAndSubmit()
      await waitFor(() => expect(push).toHaveBeenCalledWith('/reports#top'))
    })

    it('ignores a cross-origin ?callbackUrl (open redirect) and uses the callbackUrl prop', async () => {
      setSearch('?callbackUrl=https%3A%2F%2Fevil.example%2Fphish')
      render(<SignInForm callbackUrl='/admin' />)
      await fillAndSubmit()
      await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'))
      expect(signIn.mock.calls[0][1]).toMatchObject({ callbackUrl: '/admin' })
    })

    it('treats protocol-relative ?callbackUrl as cross-origin', async () => {
      setSearch('?callbackUrl=%2F%2Fevil.example')
      render(<SignInForm />)
      await fillAndSubmit()
      await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    })

    it('toggles password visibility', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)
      const password = screen.getByLabelText('Senha')
      await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
      expect(password).toHaveAttribute('type', 'text')
      await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))
      expect(password).toHaveAttribute('type', 'password')
      expect(signIn).not.toHaveBeenCalled()
    })

    it('onSubmit replaces next-auth; its { error } result maps like signIn', async () => {
      const onSubmit = vi.fn().mockResolvedValueOnce({ error: 'CredentialsSignin' })
      render(<SignInForm onSubmit={onSubmit} />)
      await fillAndSubmit()
      expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas')
      expect(onSubmit).toHaveBeenCalledWith({ identifier: 'ana@example.com', password: 'secret' })
      expect(signIn).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
    })

    it('onSuccess replaces router navigation and receives the resolved url', async () => {
      const onSuccess = vi.fn()
      setSearch('?callbackUrl=%2Fadmin')
      render(<SignInForm onSuccess={onSuccess} />)
      await fillAndSubmit()
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('/admin'))
      expect(push).not.toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    it('shows field errors and does not call signIn when invalid', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      expect(await screen.findAllByText('Campo obrigatório')).toHaveLength(2)
      expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')

      await user.type(screen.getByLabelText('E-mail'), 'not-an-email')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      expect(await screen.findByText('E-mail inválido')).toBeInTheDocument()
      expect(signIn).not.toHaveBeenCalled()
    })

    it('is pending while signing in: busy button with "Entrando...", fields disabled', async () => {
      let resolve!: (v: typeof ok) => void
      signIn.mockReturnValueOnce(new Promise((r) => (resolve = r)))
      render(<SignInForm />)
      await fillAndSubmit()
      const button = await screen.findByRole('button', { name: /Entrando/ })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByLabelText('E-mail')).toBeDisabled()
      await act(async () => resolve(ok))
    })

    it.each([
      ['CredentialsSignin', 'credentials', 'Credenciais inválidas'],
      ['AccessDenied', undefined, 'Não foi possível entrar'],
    ])('maps next-auth error %s to a localized alert', async (error, code, text) => {
      signIn.mockResolvedValueOnce({ ok: false, error, code, status: 401, url: null })
      render(<SignInForm />)
      await fillAndSubmit()
      expect(await screen.findByRole('alert')).toHaveTextContent(text)
      expect(push).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    })

    it('errorMessages maps a custom CredentialsSignin code (and accepts I18nText)', async () => {
      signIn.mockResolvedValueOnce({ ok: false, error: 'CredentialsSignin', code: 'locked', status: 401, url: null })
      render(<SignInForm errorMessages={{ locked: 'Too many attempts, wait 15 minutes.' }} />)
      await fillAndSubmit()
      expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts, wait 15 minutes.')
    })

    it('a thrown error shows the generic message; the next attempt clears it', async () => {
      signIn.mockRejectedValueOnce(new Error('network'))
      render(<SignInForm />)
      const user = await fillAndSubmit()
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar')
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations, idle and with field and auth errors', async () => {
      const user = userEvent.setup()
      const { container } = render(<SignInForm forgotPasswordHref='/forgot-password' />)
      expect(await axe(container)).toHaveNoViolations()

      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      await screen.findAllByText('Campo obrigatório')
      expect(await axe(container)).toHaveNoViolations()

      signIn.mockResolvedValueOnce({ ok: false, error: 'CredentialsSignin', code: 'credentials', status: 401, url: null })
      await fillAndSubmit()
      await screen.findByRole('alert')
      expect(await axe(container)).toHaveNoViolations()
    })

    it('links field errors to their inputs via aria-describedby', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      await screen.findAllByText('Campo obrigatório')
      expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Campo obrigatório')
    })
  })
})
