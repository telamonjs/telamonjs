/**
 * Automated accessibility (axe-core) smoke tests
 *
 * Runs axe against the REAL rendered markup of the core building blocks:
 * Button, Input+Label, AdminForm (simple section), DataTable and an open
 * CreateDialog. Any new axe violation in these graphs fails the suite.
 *
 * Notes:
 * - The global mocks in src/test/ui-mocks.tsx replace several primitives with
 *   simplified markup that would mask real accessibility issues, so the
 *   modules under test are vi.unmock'ed here (same pattern as
 *   DialogFrame.test.tsx / accessibility.test.tsx).
 * - axe rules disabled for jsdom limitations only (see runAxe below); do NOT
 *   disable rules to silence real component violations -- fix the component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, configureAxe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'

expect.extend(axeMatchers)

// vitest-axe 0.1.0 ships type augmentation for the legacy `Vi` namespace
// only; augment the vitest module so `toHaveNoViolations` type-checks.
declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Use the REAL primitives instead of the simplified global mocks from
// ui-mocks.tsx -- axe must see the production markup (roles, aria-*, ids).
vi.unmock('../ui/button')
vi.unmock('../ui/input')
vi.unmock('../ui/label')
vi.unmock('../ui/dialog')
vi.unmock('../ui/card')
vi.unmock('../ui/table')
vi.unmock('../ui/select')
vi.unmock('../ui/checkbox')
vi.unmock('../ui/badge')
vi.unmock('../ui/alert')
vi.unmock('../ui/tabs')
vi.unmock('../ui/dropdown-menu')
vi.unmock('../ui/popover')
vi.unmock('../ui/alert-dialog')
vi.unmock('@radix-ui/react-slot')
vi.unmock('@radix-ui/react-label')

// The dropdown-menu is replaced via resolve.alias in vitest.config.ts (not
// vi.mock), so vi.unmock cannot restore it. The aliased mock renders a
// <button> AROUND the asChild trigger Button (nested-interactive violation
// that does not exist in the real Radix markup). Re-point the aliased module
// to the real implementation using an absolute specifier (bypasses the alias).
vi.mock('../ui/dropdown-menu', async () => {
  return await vi.importActual<typeof import('../ui/dropdown-menu')>(
    new URL('../ui/dropdown-menu.tsx', import.meta.url).pathname
  )
})

// Components under test (must be imported AFTER the unmock declarations --
// hoisting makes the order irrelevant at runtime, but keep it readable).
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { AdminForm, type FormSection } from '../components/forms/AdminForm'
import { DataTable } from '../data/DataTable'
import { CreateDialog } from '../components/dialog/create-dialog'
import type { ColumnDef } from '@tanstack/react-table'

// DataTable / CreateDialog use Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Deterministic desktop branch for the dialog shell
vi.mock('../hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

/**
 * axe runner with jsdom-only rule exclusions:
 * - color-contrast: needs real layout/canvas; jsdom cannot compute it.
 * - region: "all content in landmarks" is a page-level best practice and is
 *   meaningless for isolated component fragments.
 */
const runAxe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

interface Entity extends Record<string, unknown> {
  id: string
  name: string
  email: string
  status: string
}

const tableData: Entity[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'active' },
  { id: '3', name: 'Bob Lee', email: 'bob@example.com', status: 'inactive' },
]

const tableColumns: ColumnDef<Entity>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
]

const formSections: FormSection[] = [
  {
    label: 'Dados',
    fields: [
      { name: 'name', label: 'Nome', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
    ],
  },
]

describe('a11y smoke (axe)', () => {
  it('Button has no violations', async () => {
    const { container } = render(
      <div>
        <Button>Salvar</Button>
        <Button variant='outline' aria-label='Fechar painel' size='icon'>
          x
        </Button>
        <Button loading>Enviando</Button>
      </div>
    )

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('Input + Label has no violations', async () => {
    const { container } = render(
      <div>
        <Label htmlFor='a11y-email'>Email</Label>
        <Input
          id='a11y-email'
          type='email'
          placeholder='email@exemplo.com'
          required
        />
      </div>
    )

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('AdminForm (simple section) has no violations', async () => {
    const { container } = render(
      <AdminForm
        fields={formSections[0].fields}
        action={vi.fn().mockResolvedValue({ success: true })}
      />
    )

    // Real field registry: both fields must be rendered before running axe
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('DataTable (small dataset) has no violations', async () => {
    const { container } = render(
      <DataTable
        tableId='a11y-table'
        data={tableData}
        columns={tableColumns}
        totalItems={tableData.length}
      />
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()

    expect(await runAxe(container)).toHaveNoViolations()
  })

  it('CreateDialog (open) has no violations', async () => {
    render(
      <CreateDialog<Entity>
        open
        onOpenChange={vi.fn()}
        createAction={vi.fn().mockResolvedValue({ success: true })}
        sections={formSections}
        title='Novo Item'
      />
    )

    // Real Radix dialog renders in a portal -> run axe on document.body
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    expect(
      await axe(document.body, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
    ).toHaveNoViolations()
  })
})
