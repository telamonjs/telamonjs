import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'
import { Sheet, SheetContent, SheetTitle } from './sheet'

// setup's ui-mocks replace ui/dialog globally; this file tests the real one.
vi.unmock('./dialog')

const warn = vi.spyOn(console, 'warn')
afterEach(() => warn.mockClear())
const missingDescriptionWarnings = () =>
  warn.mock.calls.filter(([m]) => String(m).includes('Missing `Description`'))

describe('DialogContent (consumer QA 7.3.1)', () => {
  it('defaults to max-w-lg when the caller sets no width', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog').className).toContain('max-w-lg')
  })

  it.each(['max-w-4xl', 'w-[90vw] sm:max-w-2xl', 'w-[800px]'])('keeps the caller width (%s)', cls => {
    render(
      <Dialog open>
        <DialogContent className={cls}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog').className).not.toContain('max-w-lg')
  })

  it('sr-only title and close label are translated', () => {
    render(
      <Dialog open>
        <DialogContent />
      </Dialog>
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Diálogo')
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
  })

  it('a nested title is the accessible name (no sr-only fallback injected)', () => {
    render(
      <Dialog open>
        <DialogContent>
          <div>
            <DialogTitle>Editar produto</DialogTitle>
          </div>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Editar produto')
    expect(screen.queryByText('Diálogo')).not.toBeInTheDocument()
  })

  it('no Radix "Missing Description" warning without a description', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
    expect(missingDescriptionWarnings()).toHaveLength(0)
  })

  it('points aria-describedby at the description when there is one', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription>Sobre</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Sobre')
  })

  it('Sheet: translated close label, no description warning', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
    expect(missingDescriptionWarnings()).toHaveLength(0)
  })
})
