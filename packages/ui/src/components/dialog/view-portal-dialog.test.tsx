/**
 * TDD for ViewPortalDialog: ViewDialog + ContentPortal navigation with
 * optional inline per-section editing (edit form swaps in for one section
 * at a time, guarded by useUnsavedChangesGuard).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import '../../test/ui-mocks'
import { ViewPortalDialog } from './view-portal-dialog'
import type { ViewPortalSection } from './view-portal-dialog'

expect.extend(axeMatchers as unknown as Parameters<typeof expect.extend>[0])
declare module 'vitest' {
  interface Assertion extends AxeMatchers {}
}

let mockIsMobile = false
vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

// value/onChange wired to the real RHF Controller field, same as
// crud-dialogs.test.tsx, so tests can drive isDirty by typing.
vi.mock('../../field-system/field-registry', () => ({
  getFieldRenderer: vi.fn(() => ({
    render: ({
      field,
    }: {
      field: {
        name: string
        value?: unknown
        onChange?: (value: unknown) => void
      }
    }) => (
      <input
        data-testid={`field-${field.name}`}
        name={field.name}
        value={(field.value as string) ?? ''}
        onChange={e => field.onChange?.(e.target.value)}
      />
    ),
  })),
  FieldType: {} as Record<string, never>,
}))

vi.mock('../forms/validators/config-validator', () => ({
  logValidationResult: vi.fn(),
  validateFormSections: vi.fn(() => true),
}))

interface Entity extends Record<string, unknown> {
  id: string
  nome: string
  email: string
}

const entity: Entity = { id: '1', nome: 'Alice', email: 'alice@test.com' }

const buildSections =
  (withEdit: boolean = true) =>
  (data: Entity): ViewPortalSection[] => [
    {
      value: 'dados',
      label: 'Dados',
      icon: 'User',
      content: <div data-testid='view-dados'>{data.nome}</div>,
      ...(withEdit
        ? {
            edit: {
              fields: [{ name: 'nome', label: 'Nome', type: 'text' as const }],
            },
          }
        : {}),
    },
    {
      value: 'contato',
      label: 'Contato',
      icon: 'Mail',
      content: <div data-testid='view-contato'>{data.email}</div>,
    },
  ]

describe('ViewPortalDialog', () => {
  const fetchAction = vi.fn()
  const baseProps = {
    id: '1',
    open: true,
    onOpenChange: vi.fn(),
    fetchAction,
    title: 'Detalhes',
  }

  beforeEach(() => {
    mockIsMobile = false
    fetchAction.mockReset()
    fetchAction.mockResolvedValue(entity)
  })

  describe('Rendering', () => {
    it('opens directly on the given defaultSection and shows the read view (no pencil without edit config)', async () => {
      const onSaveSection = vi.fn()
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(false)}
          defaultSection='contato'
          onSaveSection={onSaveSection}
        />
      )

      expect(await screen.findByTestId('view-contato')).toHaveTextContent(
        'alice@test.com'
      )
      expect(
        screen.queryByTestId('content-portal-edit-contato')
      ).not.toBeInTheDocument()
    })

    it('passes `columns` through to the grid launcher', async () => {
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(false)}
          columns={6}
          onSaveSection={vi.fn()}
        />
      )

      const card = await screen.findByTestId('content-portal-item-dados')
      expect(card.parentElement).toHaveClass('xl:grid-cols-6')
    })

    it('never renders the ViewDialog footer (Fechar/Editar/Excluir are redundant in the portal)', async () => {
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
          // Legacy onEdit/onDelete (runtime, pre-6.6) are swallowed by the
          // portal — neither can resurrect the footer
          {...({ onEdit: vi.fn(), onDelete: vi.fn() } as Record<
            string,
            unknown
          >)}
        />
      )

      await screen.findByTestId('view-dados')
      expect(
        screen.queryByTestId('view-dialog-close-button')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('view-dialog-edit-button')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('view-dialog-delete-button')
      ).not.toBeInTheDocument()
    })

    it('type guard: onEdit is not assignable to ViewPortalDialogProps (footer props were dropped from the Omit)', () => {
      // @ts-expect-error onEdit/onDelete/deleteConfirmation are omitted from
      // ViewPortalDialogProps — editing is inline per section and delete lives
      // in the list's row actions; there is no footer to wire them to.
      const props: Parameters<typeof ViewPortalDialog<Entity>>[0] = {
        ...baseProps,
        sections: buildSections(true),
        onEdit: () => {},
      }
      expect(props).toBeTruthy()
    })

    it('shows the pencil for a section with edit config + onSaveSection', async () => {
      const onSaveSection = vi.fn()
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={onSaveSection}
        />
      )

      expect(
        await screen.findByTestId('content-portal-edit-dados')
      ).toBeInTheDocument()
      expect(screen.getByTestId('icon-pencil')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('clicking the pencil switches the section to its edit form', async () => {
      const user = userEvent.setup()
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))

      expect(await screen.findByTestId('field-nome')).toBeInTheDocument()
      expect(screen.queryByTestId('view-dados')).not.toBeInTheDocument()
    })

    it('panel padding (7.8.0) is dropped while the section is in edit mode and restored on cancel', async () => {
      const user = userEvent.setup()
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )

      const panel = await screen.findByTestId('content-portal-panel-dados')
      expect(panel.className).toContain('p-4')

      await user.click(screen.getByTestId('content-portal-edit-dados'))
      await screen.findByTestId('field-nome')
      expect(
        screen.getByTestId('content-portal-panel-dados').className
      ).not.toContain('p-4')

      await user.click(screen.getByRole('button', { name: /cancelar/i }))
      expect(
        (await screen.findByTestId('content-portal-panel-dados')).className
      ).toContain('p-4')
    })

    it('Salvar seção calls onSaveSection with ONLY the section field names (not id/email)', async () => {
      const user = userEvent.setup()
      const onSaveSection = vi.fn().mockResolvedValue({ success: true })

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={onSaveSection}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      const input = await screen.findByTestId('field-nome')
      await user.clear(input)
      await user.type(input, 'Alice Updated')

      await user.click(
        screen.getByRole('button', { name: /salvar formulário/i })
      )

      await waitFor(() => {
        expect(onSaveSection).toHaveBeenCalledWith(
          { nome: 'Alice Updated' },
          expect.objectContaining({ value: 'dados' }),
          // 3rd arg: the record id + the fetched record
          { id: '1', item: expect.objectContaining({ id: '1', nome: 'Alice' }) }
        )
      })
    })

    it('after a successful save, reverts to the read view and refreshes the record', async () => {
      const user = userEvent.setup()
      const onSaveSection = vi.fn().mockResolvedValue({ success: true })

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={onSaveSection}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await user.type(await screen.findByTestId('field-nome'), 'x')
      await user.click(
        screen.getByRole('button', { name: /salvar formulário/i })
      )

      expect(await screen.findByTestId('view-dados')).toBeInTheDocument()
      expect(screen.queryByTestId('field-nome')).not.toBeInTheDocument()
      // fetchAction: 1 initial load + 1 silent refresh after save
      await waitFor(() => {
        expect(fetchAction.mock.calls.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('regression: guard is reset right after a successful save (no spurious confirm on the very next navigation)', async () => {
      // AdminForm's own post-submit cascade calls `cancelAction` (no
      // `onSuccess` is wired here) right after a successful submit, which
      // routes through the SAME guard.guard() used for section switching.
      // Before `guard.reset()` in onSaved, the guard still saw the pre-save
      // dirty state, so this post-submit cancelAction call itself popped the
      // "Descartar alterações?" confirm even though the save just succeeded
      // — and left it armed for the next navigation too.
      //
      // The mock AlertDialog always renders its content regardless of
      // `open` (see ui-mocks), so dialog-visibility can't be asserted via
      // text — the observable signal is behavioral: a guarded navigation
      // runs its action SYNCHRONOUSLY when clean, or gets deferred pending
      // an explicit confirm click when still (spuriously) dirty.
      const user = userEvent.setup()
      const onSaveSection = vi.fn().mockResolvedValue({ success: true })

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={onSaveSection}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await user.type(await screen.findByTestId('field-nome'), 'x')
      await user.click(
        screen.getByRole('button', { name: /salvar formulário/i })
      )

      await screen.findByTestId('view-dados')

      // Switches immediately (no confirm click needed) — proves the guard
      // was clean, not that a dialog happened not to render.
      await user.click(screen.getByTestId('content-portal-item-contato'))
      expect(await screen.findByTestId('view-contato')).toBeInTheDocument()
    })

    it('cancelling a CLEAN edit closes it directly (no confirm)', async () => {
      const user = userEvent.setup()

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await screen.findByTestId('field-nome')

      await user.click(
        screen.getByRole('button', { name: /cancelar formulário/i })
      )

      expect(await screen.findByTestId('view-dados')).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('dirty edit + switching sections via the rail opens the confirm; confirming discards and switches', async () => {
      const user = userEvent.setup()

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await user.type(await screen.findByTestId('field-nome'), 'x')

      await user.click(screen.getByTestId('content-portal-item-contato'))

      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()
      expect(screen.queryByTestId('view-contato')).not.toBeInTheDocument()

      await user.click(screen.getByTestId('alert-dialog-action'))

      expect(await screen.findByTestId('view-contato')).toBeInTheDocument()
    })

    it('only one section edits at a time: switching back to a previously-edited section shows its read view', async () => {
      const user = userEvent.setup()

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )

      // Start editing 'dados', then discard and move to 'contato'
      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await user.type(await screen.findByTestId('field-nome'), 'x')
      await user.click(screen.getByTestId('content-portal-item-contato'))
      await user.click(screen.getByTestId('alert-dialog-action'))
      await screen.findByTestId('view-contato')

      // Back to 'dados': should be read view again, not still mid-edit
      await user.click(screen.getByTestId('content-portal-item-dados'))

      expect(await screen.findByTestId('view-dados')).toBeInTheDocument()
      expect(screen.queryByTestId('field-nome')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('no onSaveSection: pencil is hidden even when the section has edit config', async () => {
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
        />
      )

      await screen.findByTestId('view-dados')
      expect(
        screen.queryByTestId('content-portal-edit-dados')
      ).not.toBeInTheDocument()
    })

    it('{success:false} keeps the edit form mounted (does not revert to read view)', async () => {
      const user = userEvent.setup()
      const onSaveSection = vi
        .fn()
        .mockResolvedValue({ success: false, message: 'Falhou' })

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={onSaveSection}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await user.type(await screen.findByTestId('field-nome'), 'x')
      await user.click(
        screen.getByRole('button', { name: /salvar formulário/i })
      )

      await waitFor(() => expect(onSaveSection).toHaveBeenCalled())
      expect(screen.getByTestId('field-nome')).toBeInTheDocument()
    })

    it('a section-level validation that is not a ZodObject (refine) is used as-is, form still works', async () => {
      const user = userEvent.setup()
      const onSaveSection = vi.fn().mockResolvedValue({ success: true })
      const refineValidation = z
        .object({ nome: z.string().min(1) })
        .refine(v => v.nome.length > 0, { message: 'obrigatório' })

      const sectionsWithRefine = (data: Entity): ViewPortalSection[] => [
        {
          value: 'dados',
          label: 'Dados',
          icon: 'User',
          content: <div data-testid='view-dados'>{data.nome}</div>,
          edit: {
            fields: [{ name: 'nome', label: 'Nome', type: 'text' as const }],
            validation: refineValidation,
          },
        },
      ]

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={sectionsWithRefine}
          defaultSection='dados'
          onSaveSection={onSaveSection}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await user.type(await screen.findByTestId('field-nome'), 'x')
      await user.click(
        screen.getByRole('button', { name: /salvar formulário/i })
      )

      await waitFor(() => expect(onSaveSection).toHaveBeenCalled())
    })
  })

  describe('Accessibility', () => {
    it('the pencil button has an accessible label', async () => {
      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )

      expect(
        await screen.findByRole('button', { name: 'Editar Dados' })
      ).toBeInTheDocument()
    })

    it('dirty form + ESC on mobile (real Radix Sheet) opens the confirm before closing', async () => {
      const user = userEvent.setup()
      mockIsMobile = true
      const onOpenChange = vi.fn()

      render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          onOpenChange={onOpenChange}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )

      await user.click(await screen.findByTestId('content-portal-edit-dados'))
      await user.type(await screen.findByTestId('field-nome'), 'x')

      await user.keyboard('{Escape}')
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('axe smoke: read stage has no violations', async () => {
      const { container } = render(
        <ViewPortalDialog<Entity>
          {...baseProps}
          sections={buildSections(true)}
          defaultSection='dados'
          onSaveSection={vi.fn()}
        />
      )
      await screen.findByTestId('view-dados')

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
