/**
 * AuditChangesViewer against the REAL Button primitive (native table/details markup).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { AuditChangesViewer } from './AuditChangesViewer'

expect.extend(axeMatchers)

vi.unmock('../../ui/button')
vi.unmock('@radix-ui/react-slot')

/** Text of every body row, cells joined by ' | '. */
const rows = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map(r => [...r.querySelectorAll('th, td')].map(c => c.textContent).join(' | '))

describe('AuditChangesViewer', () => {
  describe('Rendering', () => {
    it('renders a { field: { old, new } } diff as a field/before/after table', () => {
      render(<AuditChangesViewer changes={{ name: { old: 'Ann', new: 'Anna' }, age: { old: 30, new: 31 } }} />)
      expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Campo', 'Antes', 'Depois'])
      expect(rows()).toEqual(['name | Ann | Anna', 'age | 30 | 31'])
    })

    it('also reads the per-field { before, after } diff that @telamonjs/logger audit() writes', () => {
      render(<AuditChangesViewer changes={{ email: { before: null, after: 'a@b.c' } }} />)
      expect(rows()).toEqual(['email | null | a@b.c'])
    })

    it('renders a plain object as key/value', () => {
      render(<AuditChangesViewer changes={{ title: 'Hello', published: true, views: 3 }} />)
      expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Campo', 'Valor'])
      expect(rows()).toEqual(['title | Hello', 'published | true', 'views | 3'])
    })

    it('pretty-prints nested values inside a collapsible <details>', async () => {
      const { container } = render(<AuditChangesViewer changes={{ address: { city: 'Natal', zip: '59000' }, tags: ['a', 'b'] }} />)
      const details = container.querySelectorAll('details')
      expect(details).toHaveLength(2)
      expect(details[0]).not.toHaveAttribute('open')
      expect(within(details[0] as HTMLElement).getByText('2 itens')).toBeInTheDocument()
      await userEvent.click(within(details[0] as HTMLElement).getByText('2 itens'))
      expect(details[0]).toHaveAttribute('open')
      expect(details[0]?.querySelector('pre')?.textContent).toBe(JSON.stringify({ city: 'Natal', zip: '59000' }, null, 2))
    })

    it('renders null and missing values distinctly', () => {
      render(<AuditChangesViewer changes={{ nickname: { old: null, new: 'Al' }, note: { new: 'x' } }} />)
      expect(rows()).toEqual(['nickname | null | Al', 'note | — | x'])
    })
  })

  describe('Interactions', () => {
    it('before/after: shows only changed fields, with a toggle to show all', async () => {
      render(
        <AuditChangesViewer
          before={{ name: 'Ann', age: 30, meta: { a: 1, b: 2 } }}
          after={{ name: 'Anna', age: 30, meta: { b: 2, a: 1 } }}
        />
      )
      expect(rows()).toEqual(['name | Ann | Anna'])
      const toggle = screen.getByRole('button', { name: 'Mostrar todos os campos (3)' })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await userEvent.click(toggle)
      expect(rows()).toHaveLength(3)
      expect(screen.getByRole('button', { name: 'Mostrar só os alterados' })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('State Management', () => {
    it('before/after with no differences says so and still offers all fields', async () => {
      render(<AuditChangesViewer before={{ a: 1 }} after={{ a: 1 }} />)
      expect(screen.getByText('Nenhum campo foi alterado.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Mostrar todos os campos (1)' }))
      expect(rows()).toEqual(['a | 1 | 1'])
    })

    it('a creation (no before) lists every field of after as changed', () => {
      render(<AuditChangesViewer before={null} after={{ a: 1, b: 'x' }} />)
      expect(rows()).toEqual(['a | — | 1', 'b | — | x'])
    })

    it('reads before/after nested in changes, and JSON strings', () => {
      render(<AuditChangesViewer changes={JSON.stringify({ before: { s: 'draft' }, after: { s: 'live' } })} />)
      expect(rows()).toEqual(['s | draft | live'])
    })
  })

  describe('Edge Cases', () => {
    it('masks password/token/secret-like keys at any depth by default', () => {
      const { container } = render(
        <AuditChangesViewer
          changes={{ email: 'a@b.c', passwordHash: 'h', api_token: 't', profile: { clientSecret: 's', city: 'X' } }}
        />
      )
      expect(rows().slice(0, 3)).toEqual(['email | a@b.c', 'passwordHash | oculto', 'api_token | oculto'])
      const pre = container.querySelector('pre')?.textContent ?? ''
      expect(pre).toContain('"clientSecret": "oculto"')
      expect(pre).toContain('"city": "X"')
      expect(pre).not.toContain('"s"')
    })

    it('masks redacted keys in diffs and before/after too, and redactKeys adds keys', () => {
      const { unmount } = render(<AuditChangesViewer changes={{ password: { old: 'a', new: 'b' } }} />)
      expect(rows()).toEqual(['password | oculto | oculto'])
      unmount()
      render(<AuditChangesViewer before={{ cpf: '1', pin: '1' }} after={{ cpf: '2', pin: '2' }} redactKeys={['cpf']} />)
      expect(rows()).toEqual(['cpf | oculto | oculto', 'pin | 1 | 2'])
    })

    it('shows the empty message for null, undefined and empty objects', () => {
      const { rerender } = render(<AuditChangesViewer />)
      expect(screen.getByText('Nenhuma alteração registrada.')).toBeInTheDocument()
      rerender(<AuditChangesViewer changes={{}} />)
      expect(screen.getByText('Nenhuma alteração registrada.')).toBeInTheDocument()
      rerender(<AuditChangesViewer changes={null} />)
      expect(screen.getByText('Nenhuma alteração registrada.')).toBeInTheDocument()
    })

    it('pretty-prints a non-object payload (array, plain string)', () => {
      const { container, rerender } = render(<AuditChangesViewer changes={[1, 2]} />)
      expect(container.querySelector('pre')?.textContent).toBe(JSON.stringify([1, 2], null, 2))
      rerender(<AuditChangesViewer changes='free text' />)
      expect(screen.getByText('free text')).toBeInTheDocument()
    })

    it('an object that is not entirely { old, new } is shown as key/value', () => {
      render(<AuditChangesViewer changes={{ status: { old: 'a', new: 'b' }, reason: 'manual' }} />)
      expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Campo', 'Valor'])
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations (diff, key/value and before/after)', async () => {
      const { container } = render(
        <>
          <AuditChangesViewer changes={{ a: { old: 1, new: 2 } }} />
          <AuditChangesViewer changes={{ a: 1, nested: { b: 2 } }} />
          <AuditChangesViewer before={{ a: 1 }} after={{ a: 2 }} />
        </>
      )
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
