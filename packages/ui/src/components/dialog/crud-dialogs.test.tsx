/**
 * Characterization tests for CreateDialog / EditDialog / ViewDialog
 *
 * Pins the shared dialog behaviors (mobile Sheet vs desktop Dialog branch,
 * loading/error states, header precedence renderHeader > headerConfig > default,
 * tabs on/off, close-on-success) so the CrudDialogShell refactor cannot
 * change observable behavior.
 *
 * Notes:
 * - The global Dialog mock (src/test/ui-mocks.tsx) renders null when closed
 *   and exposes data-testid="dialog" / "dialog-title" when open.
 * - Sheet is NOT globally mocked, so mobile assertions run against the real
 *   Radix Sheet (rendered in a portal).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CreateDialog } from './create-dialog'
import { EditDialog } from './edit-dialog'
import { ViewDialog } from './view-dialog'
import type { FormSection } from '../forms/AdminForm'
import type { DialogHeaderConfig } from '../../types/dialog-header'

// Controllable mobile detection (same module used by the dialogs/shell)
let mockIsMobile = false
vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

// EditDialog uses next/navigation's useRouter
const routerRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: routerRefresh,
  }),
  usePathname: () => '/admin/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Simplify field rendering (same pattern as CreateForm/EditForm tests).
// value/onChange are wired to the real RHF Controller field so tests can
// drive isDirty (unsaved-changes guard) by typing into the input.
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

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

interface Entity extends Record<string, unknown> {
  id: string
  name: string
  email: string
}

const entity: Entity = { id: '1', name: 'Alice', email: 'alice@test.com' }

const oneSection: FormSection[] = [
  {
    label: 'Dados',
    fields: [{ name: 'name', label: 'Nome', type: 'text' }],
  },
]

const twoSections: FormSection[] = [
  {
    label: 'Dados',
    fields: [{ name: 'name', label: 'Nome', type: 'text' }],
  },
  {
    label: 'Contato',
    fields: [{ name: 'email', label: 'Email', type: 'email' }],
  },
]

const headerConfig: DialogHeaderConfig<Entity> = {
  icon: 'Settings',
  iconColor: 'purple',
  title: 'FromConfig',
}

beforeEach(() => {
  mockIsMobile = false
  routerRefresh.mockClear()
})

// ============================================================================
// CreateDialog
// ============================================================================
describe('CreateDialog (characterization)', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    createAction: vi.fn().mockResolvedValue({ success: true }),
    sections: twoSections,
    title: 'Novo Item',
  }

  it('renders desktop Dialog with default header title', () => {
    render(<CreateDialog<Entity> {...baseProps} />)

    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Novo Item')
  })

  it('renders nothing on desktop when closed', () => {
    render(<CreateDialog<Entity> {...baseProps} open={false} />)

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('renders mobile Sheet (not Dialog) when isMobile', () => {
    mockIsMobile = true
    render(<CreateDialog<Entity> {...baseProps} />)

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    // Real Radix Sheet renders title text in a portal
    expect(screen.getByText('Novo Item')).toBeInTheDocument()
  })

  it('short multi-section form is one page by default (7.14: tabs only above 20 fields)', () => {
    render(<CreateDialog<Entity> {...baseProps} />)

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renders tabs with useTabs explicitly true', () => {
    render(<CreateDialog<Entity> {...baseProps} useTabs />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /dados/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /contato/i })).toBeInTheDocument()
  })

  it('renders tabs by default when the form has more than 20 fields', () => {
    const long: FormSection[] = twoSections.map((sec, i) => ({
      ...sec,
      fields: Array.from({ length: 11 }, (_, j) => ({
        name: `f${i}_${j}`,
        label: `F${i}${j}`,
        type: 'text' as const,
      })),
    }))
    render(<CreateDialog<Entity> {...baseProps} sections={long} />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('does not render tabs when useTabs is false', () => {
    render(<CreateDialog<Entity> {...baseProps} useTabs={false} />)

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('auto-disables tabs with a single section', () => {
    render(<CreateDialog<Entity> {...baseProps} sections={oneSection} />)

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('excludes editOnly sections when deciding tabs', () => {
    const sections: FormSection[] = [
      twoSections[0],
      { ...twoSections[1], editOnly: true },
    ]
    render(<CreateDialog<Entity> {...baseProps} sections={sections} />)

    // Only 1 visible section -> tabs auto-disabled
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renderHeader takes precedence over headerConfig', () => {
    render(
      <CreateDialog<Entity>
        {...baseProps}
        renderHeader={() => <div data-testid='custom-header'>Custom</div>}
        headerConfig={headerConfig}
      />
    )

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
    expect(screen.queryByText('FromConfig')).not.toBeInTheDocument()
    // sr-only DialogTitle still rendered for a11y
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Novo Item')
  })

  it('uses headerConfig when renderHeader is not provided', () => {
    render(<CreateDialog<Entity> {...baseProps} headerConfig={headerConfig} />)

    expect(screen.getByText('FromConfig')).toBeInTheDocument()
  })

  it('renders default header when neither renderHeader nor headerConfig given', () => {
    render(<CreateDialog<Entity> {...baseProps} />)

    expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
    expect(screen.queryByText('FromConfig')).not.toBeInTheDocument()
  })

  it('closes dialog and calls onSuccess after successful submit', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    render(
      <CreateDialog<Entity>
        {...baseProps}
        sections={oneSection}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    )

    await user.click(screen.getByRole('button', { name: /salvar formulário/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('closes even when onSuccess (list refresh) rejects', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn().mockRejectedValue(new Error('refetch 500'))
    render(
      <CreateDialog<Entity>
        {...baseProps}
        sections={oneSection}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    )
    await user.click(screen.getByRole('button', { name: /salvar formulário/i }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  describe('unsaved-changes guard (consumer QA 7.3.1)', () => {
    it('clean form: Cancelar closes directly', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<CreateDialog<Entity> {...baseProps} sections={oneSection} onOpenChange={onOpenChange} />)
      await user.click(screen.getByRole('button', { name: /cancelar formulário/i }))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('dirty form: Cancelar asks before discarding', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<CreateDialog<Entity> {...baseProps} sections={oneSection} onOpenChange={onOpenChange} />)
      await user.type(await screen.findByTestId('field-name'), 'x')
      await user.click(screen.getByRole('button', { name: /cancelar formulário/i }))
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()
      await user.click(screen.getByTestId('alert-dialog-action'))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('dirty form on mobile: ESC (real Radix Sheet) asks before closing', async () => {
      const user = userEvent.setup()
      mockIsMobile = true
      const onOpenChange = vi.fn()
      render(<CreateDialog<Entity> {...baseProps} sections={oneSection} onOpenChange={onOpenChange} />)
      await user.type(await screen.findByTestId('field-name'), 'x')
      await user.keyboard('{Escape}')
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// EditDialog
// ============================================================================
describe('EditDialog (characterization)', () => {
  const fetchAction = vi.fn()
  const baseProps = {
    id: '1',
    open: true,
    onOpenChange: vi.fn(),
    fetchAction,
    updateAction: vi.fn().mockResolvedValue({ success: true }),
    sections: twoSections,
    title: 'Editar Item',
  }

  beforeEach(() => {
    fetchAction.mockReset()
    fetchAction.mockResolvedValue(entity)
  })

  it('shows loading state while fetching (desktop)', () => {
    fetchAction.mockReturnValue(new Promise(() => undefined))
    render(<EditDialog<Entity> {...baseProps} />)

    expect(screen.getByText('Carregando dados...')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renders form after data loads, resolving function titles with data', async () => {
    render(
      <EditDialog<Entity>
        {...baseProps}
        title={item => `Editar ${item.name}`}
      />
    )

    expect(await screen.findByTestId('field-name')).toBeInTheDocument()
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Editar Alice')
  })

  it('shows error state when fetch fails (desktop)', async () => {
    fetchAction.mockRejectedValue(new Error('Falha ao buscar'))
    render(<EditDialog<Entity> {...baseProps} />)

    expect(await screen.findByText('Falha ao buscar')).toBeInTheDocument()
    expect(screen.getByTestId('alert')).toHaveAttribute(
      'data-variant',
      'destructive'
    )
  })

  it('short multi-section edit is one page by default; useTabs forces tabs', async () => {
    const { unmount } = render(<EditDialog<Entity> {...baseProps} />)
    expect(await screen.findByTestId('field-name')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    unmount()

    render(<EditDialog<Entity> {...baseProps} useTabs />)
    expect(await screen.findByRole('tablist')).toBeInTheDocument()
  })

  it('form header drops the stats cards (they belong to the view)', async () => {
    render(
      <EditDialog<Entity>
        {...baseProps}
        headerConfig={{
          ...headerConfig,
          stats: { items: [{ label: 'Card do header', value: () => '7', icon: 'Car', color: 'blue' }] },
        } as never}
      />
    )
    expect(await screen.findByTestId('field-name')).toBeInTheDocument()
    expect(screen.queryByText('Card do header')).not.toBeInTheDocument()
  })

  it('does not render tabs when useTabs is false', async () => {
    render(<EditDialog<Entity> {...baseProps} useTabs={false} />)

    expect(await screen.findByTestId('field-name')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renderHeader takes precedence over headerConfig and receives data', async () => {
    render(
      <EditDialog<Entity>
        {...baseProps}
        renderHeader={data => (
          <div data-testid='custom-header'>{data.name}</div>
        )}
        headerConfig={headerConfig}
      />
    )

    expect(await screen.findByTestId('custom-header')).toHaveTextContent(
      'Alice'
    )
    expect(screen.queryByText('FromConfig')).not.toBeInTheDocument()
  })

  it('uses headerConfig when renderHeader is not provided', async () => {
    render(<EditDialog<Entity> {...baseProps} headerConfig={headerConfig} />)

    expect(await screen.findByText('FromConfig')).toBeInTheDocument()
  })

  // ==========================================================================
  // headerData (lacuna 5 fix): header/title fed by the caller's known row
  // instead of the record fetchAction resolves — needed when getForEdit
  // returns TFormData that lacks denormalized fields the list row already has.
  // ==========================================================================
  describe('headerData', () => {
    const rowFromList: Entity = {
      id: '1',
      name: 'Alice (from list)',
      email: 'alice@test.com',
    }

    it('feeds renderHeader with headerData instead of the fetched record', async () => {
      render(
        <EditDialog<Entity>
          {...baseProps}
          headerData={rowFromList}
          renderHeader={data => (
            <div data-testid='custom-header'>{data.name}</div>
          )}
        />
      )

      expect(await screen.findByTestId('custom-header')).toHaveTextContent(
        'Alice (from list)'
      )
    })

    it('renders the header from headerData before fetchAction resolves (mobile Sheet — desktop shows a status card instead of any header while loading)', () => {
      mockIsMobile = true
      fetchAction.mockReturnValue(new Promise(() => undefined))

      render(
        <EditDialog<Entity>
          {...baseProps}
          headerData={rowFromList}
          renderHeader={data => (
            <div data-testid='custom-header'>{data.name}</div>
          )}
        />
      )

      // Header renders immediately from headerData — body still loads.
      expect(screen.getByTestId('custom-header')).toHaveTextContent(
        'Alice (from list)'
      )
      expect(screen.getByText('Carregando dados...')).toBeInTheDocument()
    })

    it('resolves a function title from headerData', () => {
      fetchAction.mockReturnValue(new Promise(() => undefined))

      render(
        <EditDialog<Entity>
          {...baseProps}
          headerData={rowFromList}
          title={item => `Editar ${item.name}`}
        />
      )

      expect(screen.getByTestId('dialog-title')).toHaveTextContent(
        'Editar Alice (from list)'
      )
    })

    it('falls back to the fetched record when headerData is omitted (unchanged default behavior)', async () => {
      render(
        <EditDialog<Entity>
          {...baseProps}
          renderHeader={data => (
            <div data-testid='custom-header'>{data.name}</div>
          )}
        />
      )

      expect(await screen.findByTestId('custom-header')).toHaveTextContent(
        'Alice'
      )
    })
  })

  // ==========================================================================
  // headerRow (PRD 068 item 1): the list row merged UNDER the fetched record —
  // the fetch wins on every key it defines, the row fills the gaps (joined /
  // denormalized fields getForEdit does not return). headerData keeps its
  // replace-everything semantics (consumers depend on it).
  // ==========================================================================
  describe('headerRow', () => {
    interface Row extends Entity {
      categoria?: string | null
    }
    const row: Row = {
      id: '1',
      name: 'Alice (list)',
      email: 'old@test.com',
      categoria: 'VIP',
    }
    const header = (data: Row) => (
      <div data-testid='custom-header'>
        {data.name}|{data.email}|{String(data.categoria)}
      </div>
    )

    it('fills keys the fetched record lacks; the fetched record wins on the rest', async () => {
      render(
        <EditDialog<Row> {...baseProps} headerRow={row} renderHeader={header} />
      )

      expect(await screen.findByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('custom-header')).toHaveTextContent(
        'Alice|alice@test.com|VIP'
      )
    })

    it('a key the fetched record returns as undefined does not erase the row value', async () => {
      fetchAction.mockResolvedValue({ ...entity, categoria: undefined })
      render(
        <EditDialog<Row> {...baseProps} headerRow={row} renderHeader={header} />
      )

      expect(await screen.findByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('custom-header')).toHaveTextContent('|VIP')
    })

    it('a key the fetched record returns as null still wins (explicit empty value)', async () => {
      fetchAction.mockResolvedValue({ ...entity, categoria: null })
      render(
        <EditDialog<Row> {...baseProps} headerRow={row} renderHeader={header} />
      )

      expect(await screen.findByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('custom-header')).toHaveTextContent('|null')
    })

    it('renders the header from the row before the fetch resolves (mobile Sheet)', () => {
      mockIsMobile = true
      fetchAction.mockReturnValue(new Promise(() => undefined))
      render(
        <EditDialog<Row> {...baseProps} headerRow={row} renderHeader={header} />
      )

      expect(screen.getByTestId('custom-header')).toHaveTextContent(
        'Alice (list)|old@test.com|VIP'
      )
    })

    it('headerData still replaces everything when both are given (existing contract)', async () => {
      const known: Row = { ...row, name: 'Known', email: 'known@test.com' }
      render(
        <EditDialog<Row>
          {...baseProps}
          headerData={known}
          headerRow={row}
          renderHeader={header}
        />
      )

      expect(await screen.findByTestId('field-name')).toBeInTheDocument()
      expect(screen.getByTestId('custom-header')).toHaveTextContent(
        'Known|known@test.com|VIP'
      )
    })
  })

  it('renders mobile Sheet with title when isMobile', async () => {
    mockIsMobile = true
    render(<EditDialog<Entity> {...baseProps} />)

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Editar Item')).toBeInTheDocument()
    expect(await screen.findByTestId('field-name')).toBeInTheDocument()
  })

  it('closes dialog, calls onSuccess and refreshes router after successful submit', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    render(
      <EditDialog<Entity>
        {...baseProps}
        sections={oneSection}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    )

    await screen.findByTestId('field-name')
    await user.click(screen.getByRole('button', { name: /salvar formulário/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(routerRefresh).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  // ==========================================================================
  // Unsaved-changes guard
  // ==========================================================================
  describe('unsaved-changes guard', () => {
    it('risk 3 — opening and closing without typing anything never confirms (Cancelar closes directly)', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <EditDialog<Entity>
          {...baseProps}
          sections={oneSection}
          onOpenChange={onOpenChange}
        />
      )

      await screen.findByTestId('field-name')
      await user.click(
        screen.getByRole('button', { name: /cancelar formulário/i })
      )

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('clean form: Cancelar closes directly, no confirm', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <EditDialog<Entity>
          {...baseProps}
          sections={oneSection}
          onOpenChange={onOpenChange}
        />
      )

      await screen.findByTestId('field-name')
      await user.click(
        screen.getByRole('button', { name: /cancelar formulário/i })
      )

      expect(onOpenChange).toHaveBeenCalledTimes(1)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('dirty form: Cancelar opens the confirm and only closes after confirming', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <EditDialog<Entity>
          {...baseProps}
          sections={oneSection}
          onOpenChange={onOpenChange}
        />
      )

      const input = await screen.findByTestId('field-name')
      await user.type(input, 'x')

      await user.click(
        screen.getByRole('button', { name: /cancelar formulário/i })
      )
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()

      await user.click(screen.getByTestId('alert-dialog-action'))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('dirty form: Cancelar then "Continuar editando" keeps the dialog open', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <EditDialog<Entity>
          {...baseProps}
          sections={oneSection}
          onOpenChange={onOpenChange}
        />
      )

      const input = await screen.findByTestId('field-name')
      await user.type(input, 'x')
      await user.click(
        screen.getByRole('button', { name: /cancelar formulário/i })
      )

      await user.click(screen.getByTestId('alert-dialog-cancel'))
      expect(onOpenChange).not.toHaveBeenCalled()
    })

    it('dirty form on mobile: ESC (real Radix Sheet) opens the confirm before closing', async () => {
      const user = userEvent.setup()
      mockIsMobile = true
      const onOpenChange = vi.fn()

      render(
        <EditDialog<Entity>
          {...baseProps}
          sections={oneSection}
          onOpenChange={onOpenChange}
        />
      )

      const input = await screen.findByTestId('field-name')
      await user.type(input, 'x')

      await user.keyboard('{Escape}')
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()

      // fireEvent (not user.click): the real Radix Sheet's exit-transition
      // bookkeeping from the Escape keydown above leaves `pointer-events:
      // none` on the body for a tick, which user-event's pointer-interaction
      // check rejects even though the (mocked) AlertDialogAction is a plain
      // button unrelated to the Sheet's own overlay.
      fireEvent.click(screen.getByTestId('alert-dialog-action'))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})

// ============================================================================
// ViewDialog
// ============================================================================
describe('ViewDialog (characterization)', () => {
  const fetchAction = vi.fn()
  const baseProps = {
    id: '1',
    open: true,
    onOpenChange: vi.fn(),
    fetchAction,
    title: 'Detalhes',
    renderContent: (data: Entity) => (
      <div data-testid='view-content'>{data.name}</div>
    ),
  }

  beforeEach(() => {
    fetchAction.mockReset()
    fetchAction.mockResolvedValue(entity)
  })

  it('shows loading state while fetching (desktop)', () => {
    fetchAction.mockReturnValue(new Promise(() => undefined))
    render(<ViewDialog<Entity> {...baseProps} />)

    expect(screen.getByText('Carregando dados...')).toBeInTheDocument()
    expect(screen.queryByTestId('view-content')).not.toBeInTheDocument()
  })

  it('renders content after data loads', async () => {
    render(<ViewDialog<Entity> {...baseProps} />)

    expect(await screen.findByTestId('view-content')).toHaveTextContent('Alice')
  })

  it('shows error state when fetch fails (desktop)', async () => {
    fetchAction.mockRejectedValue(new Error('Não encontrado'))
    render(<ViewDialog<Entity> {...baseProps} />)

    expect(await screen.findByText('Não encontrado')).toBeInTheDocument()
  })

  it('renderHeader takes precedence over headerConfig and receives data', async () => {
    render(
      <ViewDialog<Entity>
        {...baseProps}
        renderHeader={data => (
          <div data-testid='custom-header'>{data.name}</div>
        )}
        headerConfig={headerConfig}
      />
    )

    expect(await screen.findByTestId('custom-header')).toHaveTextContent(
      'Alice'
    )
    expect(screen.queryByText('FromConfig')).not.toBeInTheDocument()
  })

  it('uses headerConfig when renderHeader is not provided', async () => {
    render(<ViewDialog<Entity> {...baseProps} headerConfig={headerConfig} />)

    expect(await screen.findByText('FromConfig')).toBeInTheDocument()
  })

  it('renders mobile Sheet when isMobile', async () => {
    mockIsMobile = true
    render(<ViewDialog<Entity> {...baseProps} />)

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Detalhes')).toBeInTheDocument()
    expect(await screen.findByTestId('view-content')).toBeInTheDocument()
  })

  it('forceDesktopMode renders Dialog even when isMobile', async () => {
    mockIsMobile = true
    render(<ViewDialog<Entity> {...baseProps} forceDesktopMode />)

    expect(await screen.findByTestId('dialog')).toBeInTheDocument()
  })

  it('renders no footer when neither onEdit nor onDelete provided', async () => {
    render(<ViewDialog<Entity> {...baseProps} />)

    await screen.findByTestId('view-content')
    expect(screen.queryByText('Fechar')).not.toBeInTheDocument()
    expect(screen.queryByText('Editar')).not.toBeInTheDocument()
  })

  it('Fechar button closes dialog; Editar closes and calls onEdit', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onEdit = vi.fn()

    render(
      <ViewDialog<Entity>
        {...baseProps}
        onOpenChange={onOpenChange}
        onEdit={onEdit}
      />
    )

    await screen.findByTestId('view-content')

    await user.click(screen.getByText('Fechar'))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    onOpenChange.mockClear()
    await user.click(screen.getByText('Editar'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onEdit).toHaveBeenCalled()
  })

  it('delete confirmation executes onDelete and closes dialog', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(
      <ViewDialog<Entity>
        {...baseProps}
        onOpenChange={onOpenChange}
        onDelete={onDelete}
      />
    )

    await screen.findByTestId('view-content')

    // AlertDialog is mocked (always renders its content); confirm directly
    await user.click(screen.getByTestId('alert-dialog-action'))

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
