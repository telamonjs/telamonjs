/**
 * QueryErrorState against the REAL Alert and Button primitives.
 */

import { describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { msg } from '../../i18n/msg'
import { QueryErrorState } from './QueryErrorState'

expect.extend(axeMatchers)

vi.unmock('../../ui/alert')
vi.unmock('../../ui/button')
vi.unmock('@radix-ui/react-slot')

const deferred = () => {
  let resolve!: () => void
  let reject!: (e: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('QueryErrorState', () => {
  describe('Rendering', () => {
    it('renders the localized default title as an alert', () => {
      render(<QueryErrorState />)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Erro ao carregar dados')
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('shows the message extracted from an Error', () => {
      render(<QueryErrorState error={new Error('Servidor indisponível')} />)
      expect(screen.getByText('Servidor indisponível')).toBeInTheDocument()
    })

    it('accepts a string error and an object carrying `message` (API client errors)', () => {
      const { rerender } = render(<QueryErrorState error='Falhou' />)
      expect(screen.getByText('Falhou')).toBeInTheDocument()
      rerender(<QueryErrorState error={{ message: 'HTTP 500', status: 500 }} />)
      expect(screen.getByText('HTTP 500')).toBeInTheDocument()
    })

    it('title and description accept I18nText; description replaces the extracted message', () => {
      render(
        <QueryErrorState
          error={new Error('raw backend text')}
          title={msg('telamonjs.common.error')}
          description='Não foi possível carregar o barema.'
        />
      )
      expect(screen.getByText('Erro')).toBeInTheDocument()
      expect(screen.getByText('Não foi possível carregar o barema.')).toBeInTheDocument()
      expect(screen.queryByText('raw backend text')).not.toBeInTheDocument()
    })

    it('renders the retry button with the localized default or a custom label', () => {
      const { rerender } = render(<QueryErrorState onRetry={() => {}} />)
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toHaveAttribute('type', 'button')
      rerender(<QueryErrorState onRetry={() => {}} retryLabel='Recarregar' />)
      expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onRetry without arguments (safe for react-query `refetch`)', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()
      render(<QueryErrorState onRetry={onRetry} />)
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith()
    })

    it('never submits a surrounding form', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <QueryErrorState onRetry={() => {}} />
        </form>
      )
      await user.click(screen.getByRole('button'))
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    it('is pending while the promise returned by onRetry runs, and ignores clicks meanwhile', async () => {
      const user = userEvent.setup()
      const d = deferred()
      const onRetry = vi.fn(() => d.promise)
      render(<QueryErrorState onRetry={onRetry} />)
      const button = screen.getByRole('button', { name: 'Tentar novamente' })

      await user.click(button)
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
      await user.click(button)
      expect(onRetry).toHaveBeenCalledTimes(1)

      await act(async () => d.resolve())
      expect(button).toBeEnabled()
      expect(button).not.toHaveAttribute('aria-busy')
    })

    it('`retrying` drives the pending state from the caller (e.g. query.isFetching)', () => {
      const { rerender } = render(<QueryErrorState onRetry={() => {}} retrying />)
      expect(screen.getByRole('button')).toBeDisabled()
      rerender(<QueryErrorState onRetry={() => {}} retrying={false} />)
      expect(screen.getByRole('button')).toBeEnabled()
    })
  })

  describe('Edge Cases', () => {
    it('a rejected onRetry ends the pending state without an unhandled rejection', async () => {
      const user = userEvent.setup()
      const d = deferred()
      render(<QueryErrorState onRetry={() => d.promise} />)
      const button = screen.getByRole('button')
      await user.click(button)
      await act(async () => d.reject(new Error('still down')))
      expect(button).toBeEnabled()
    })

    it('ignores errors without a usable message (empty string, plain objects, numbers)', () => {
      const { rerender, container } = render(<QueryErrorState error='' />)
      expect(container.querySelector('[data-testid="query-error-description"]')).toBeNull()
      rerender(<QueryErrorState error={{ code: 42 }} />)
      expect(container.querySelector('[data-testid="query-error-description"]')).toBeNull()
      rerender(<QueryErrorState error={500} />)
      expect(container.querySelector('[data-testid="query-error-description"]')).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations, idle and pending', async () => {
      const user = userEvent.setup()
      const d = deferred()
      const { container } = render(
        <QueryErrorState error={new Error('Timeout')} onRetry={() => d.promise} />
      )
      expect(await axe(container)).toHaveNoViolations()
      await user.click(screen.getByRole('button'))
      expect(await axe(container)).toHaveNoViolations()
      await act(async () => d.resolve())
    })
  })
})
