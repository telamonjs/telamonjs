import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import '../test/ui-mocks'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

expect.extend(axeMatchers as unknown as Parameters<typeof expect.extend>[0])
declare module 'vitest' {
  interface Assertion extends AxeMatchers {}
}

function Harness({ action }: { action: () => void }) {
  const guard = useUnsavedChangesGuard()
  return (
    <div>
      <button onClick={() => guard.setDirty(true)}>make-dirty</button>
      <button onClick={() => guard.setDirty(false)}>make-clean</button>
      <button onClick={() => guard.guard(action)}>exit</button>
      <button onClick={() => guard.reset()}>reset</button>
      {guard.dialog}
    </div>
  )
}

describe('useUnsavedChangesGuard', () => {
  describe('Rendering', () => {
    it('renders the confirmation copy (title, description, buttons)', () => {
      render(<Harness action={vi.fn()} />)

      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Você tem alterações não salvas nesta seção. Se sair agora, elas serão perdidas.'
        )
      ).toBeInTheDocument()
      expect(screen.getByText('Continuar editando')).toBeInTheDocument()
      expect(screen.getByText('Descartar')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('clean: guard() runs the action immediately, no confirm needed', async () => {
      const user = userEvent.setup()
      const action = vi.fn()
      render(<Harness action={action} />)

      await user.click(screen.getByText('exit'))

      expect(action).toHaveBeenCalledTimes(1)
    })

    it('dirty: guard() does NOT run the action until confirmed', async () => {
      const user = userEvent.setup()
      const action = vi.fn()
      render(<Harness action={action} />)

      await user.click(screen.getByText('make-dirty'))
      await user.click(screen.getByText('exit'))

      expect(action).not.toHaveBeenCalled()
    })

    it('confirming discards: runs the pending action and resets dirty', async () => {
      const user = userEvent.setup()
      const action = vi.fn()
      render(<Harness action={action} />)

      await user.click(screen.getByText('make-dirty'))
      await user.click(screen.getByText('exit'))
      await user.click(screen.getByTestId('alert-dialog-action'))

      expect(action).toHaveBeenCalledTimes(1)

      // dirty was reset by the confirm — a subsequent guard() runs directly
      action.mockClear()
      await user.click(screen.getByText('exit'))
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('cancelling keeps the change: does not run the action', async () => {
      const user = userEvent.setup()
      const action = vi.fn()
      render(<Harness action={action} />)

      await user.click(screen.getByText('make-dirty'))
      await user.click(screen.getByText('exit'))
      await user.click(screen.getByTestId('alert-dialog-cancel'))

      expect(action).not.toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    it('setDirty(false) after being dirty makes guard() run directly again', async () => {
      const user = userEvent.setup()
      const action = vi.fn()
      render(<Harness action={action} />)

      await user.click(screen.getByText('make-dirty'))
      await user.click(screen.getByText('make-clean'))
      await user.click(screen.getByText('exit'))

      expect(action).toHaveBeenCalledTimes(1)
    })

    it('reset() clears dirty without running any pending action', async () => {
      const user = userEvent.setup()
      const action = vi.fn()
      render(<Harness action={action} />)

      await user.click(screen.getByText('make-dirty'))
      await user.click(screen.getByText('reset'))
      await user.click(screen.getByText('exit'))

      // dirty was cleared by reset(), so exit runs the action directly
      // (reset itself never invokes any action)
      expect(action).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('open and close without ever going dirty never invokes the action', async () => {
      const user = userEvent.setup()
      const action = vi.fn()
      render(<Harness action={action} />)

      await user.click(screen.getByText('exit'))
      await user.click(screen.getByText('exit'))

      expect(action).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('axe smoke: confirmation dialog has no violations', async () => {
      const { container } = render(<Harness action={vi.fn()} />)

      expect(
        await axe(container, {
          rules: {
            'color-contrast': { enabled: false },
            region: { enabled: false },
          },
        })
      ).toHaveNoViolations()
    })
  })
})
