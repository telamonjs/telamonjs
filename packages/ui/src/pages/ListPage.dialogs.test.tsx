import { act, render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { z } from 'zod'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'
import { createPaginatedResponse } from '../types/pagination'

const { loggerWarnSpy } = vi.hoisted(() => ({ loggerWarnSpy: vi.fn() }))

// Avoid loading @telamonjs/logger (published dist breaks Node ESM resolution)
vi.mock('../utils/logger', () => {
  const noop = () => undefined
  const mockLogger: Record<string, unknown> = {
    debug: noop,
    info: noop,
    warn: loggerWarnSpy,
    error: noop,
    fatal: noop,
  }
  mockLogger.child = () => mockLogger
  mockLogger.withUser = () => mockLogger
  return {
    logger: mockLogger,
    withComponent: () => mockLogger,
    withUser: () => mockLogger,
    withRoute: () => mockLogger,
    log: mockLogger,
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}))

// Captures the handlers ListPage wires, so tests can open the (lazy) dialogs
let tableProps: Record<string, any> = {}
vi.mock('../data/DataTable', () => ({
  DataTable: (props: Record<string, unknown>) => {
    tableProps = props
    return <div data-testid='datatable-mock' />
  },
}))

// Prop recorders: capture exactly what ListPage forwards to each dialog
const createDialogSpy = vi.fn()
const editDialogSpy = vi.fn()

vi.mock('../components/dialog/create-dialog', () => ({
  CreateDialog: (props: Record<string, unknown>) => {
    createDialogSpy(props)
    return null
  },
}))

vi.mock('../components/dialog/edit-dialog', () => ({
  EditDialog: (props: Record<string, unknown>) => {
    editDialogSpy(props)
    return null
  },
}))

const viewDialogSpy = vi.fn()
const viewPortalDialogSpy = vi.fn()

vi.mock('../components/dialog/view-dialog', () => ({
  ViewDialog: (props: Record<string, unknown>) => {
    viewDialogSpy(props)
    return null
  },
}))

vi.mock('../components/dialog/view-portal-dialog', () => ({
  ViewPortalDialog: (props: Record<string, unknown>) => {
    viewPortalDialogSpy(props)
    return null
  },
}))

interface MockUser {
  id: string
  name: string
  email: string
}

// Distinguishable reference — the portal test asserts `validation` forwarded
// to ViewPortalDialog is exactly this object (config.form.validation).
const formValidation = z.object({ name: z.string(), email: z.string() })

function makeConfig(
  dialogs: CrudConfig<MockUser, Partial<MockUser>>['dialogs']
): CrudConfig<MockUser, Partial<MockUser>> {
  return {
    module: { name: 'users', title: 'Users', route: '/admin/users' },
    list: {
      infiniteScroll: false,
      columns: [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'email', header: 'Email' },
      ],
    },
    form: {
      validation: formValidation,
      sections: [
        {
          title: 'Dados',
          fields: [{ name: 'name', label: 'Nome', type: 'text' }],
        },
        {
          title: 'Contato',
          fields: [{ name: 'email', label: 'Email', type: 'email' }],
        },
      ],
    },
    query: {
      queryKey: ['users'],
      queryFn: vi.fn().mockResolvedValue(
        // one row so ListPage renders the (mocked) table that exposes the open handlers
        createPaginatedResponse(
          [{ id: '1', name: 'A', email: 'a@x.com' }],
          1,
          1,
          10
        )
      ),
    },
    mutations: {
      create: { mutationFn: vi.fn(), invalidates: [['users']] },
      update: { mutationFn: vi.fn(), invalidates: [['users']] },
      delete: { mutationFn: vi.fn(), invalidates: [['users']] },
    },
    dialogs,
  }
}

function renderListPage(config: CrudConfig<MockUser, Partial<MockUser>>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ListPage<MockUser> config={config} />
    </QueryClientProvider>
  )
}

/**
 * Dialogs are React.lazy and mount on first open: open every configured one via the
 * handlers ListPage gives the table, then wait for the (mocked) chunks to render.
 */
async function openDialogs(
  dialogs: NonNullable<CrudConfig<MockUser, Partial<MockUser>>['dialogs']>
) {
  await waitFor(() => expect(Object.keys(tableProps).length).toBeGreaterThan(0))
  // One act per dialog: opening one closes the others, so batching would mount only the last
  const row = { id: '1', name: 'A', email: 'a@x.com' }
  if (dialogs.create) await act(async () => tableProps.onAdd?.())
  if (dialogs.view) await act(async () => tableProps.onRowClick?.(row))
  if (dialogs.edit) {
    await act(async () => {
      await tableProps.actionsConfig.standard.edit.handler(row)
    })
  }
  const spies = [
    dialogs.create && createDialogSpy,
    dialogs.edit && editDialogSpy,
    dialogs.view && (dialogs.view.portal ? viewPortalDialogSpy : viewDialogSpy),
  ].filter(Boolean) as Array<ReturnType<typeof vi.fn>>
  await waitFor(() => spies.forEach(spy => expect(spy).toHaveBeenCalled()))
}

describe('ListPage - dialog useTabs pass-through', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards dialogs.create.useTabs: false to CreateDialog', async () => {
    renderListPage(
      makeConfig({ create: { title: 'Novo usuário', useTabs: false } })
    )
    await openDialogs({ create: { title: 'Novo usuário', useTabs: false } })

    expect(createDialogSpy).toHaveBeenCalled()
    const props = createDialogSpy.mock.calls.at(-1)![0]
    expect(props.useTabs).toBe(false)
  })

  it('forwards dialogs.create.useTabs: true to CreateDialog', async () => {
    renderListPage(
      makeConfig({ create: { title: 'Novo usuário', useTabs: true } })
    )
    await openDialogs({ create: { title: 'Novo usuário', useTabs: true } })

    const props = createDialogSpy.mock.calls.at(-1)![0]
    expect(props.useTabs).toBe(true)
  })

  it('leaves useTabs undefined when not configured (CreateDialog default applies)', async () => {
    renderListPage(makeConfig({ create: { title: 'Novo usuário' } }))
    await openDialogs({ create: { title: 'Novo usuário' } })

    const props = createDialogSpy.mock.calls.at(-1)![0]
    expect(props.useTabs).toBeUndefined()
  })

  it('forwards dialogs.edit.useTabs: false to EditDialog (parity)', async () => {
    renderListPage(
      makeConfig({ edit: { title: 'Editar usuário', useTabs: false } })
    )
    await openDialogs({ edit: { title: 'Editar usuário', useTabs: false } })

    expect(editDialogSpy).toHaveBeenCalled()
    const props = editDialogSpy.mock.calls.at(-1)![0]
    expect(props.useTabs).toBe(false)
  })
})

describe('ListPage - dialogs.view.portal (A1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const portalSections = vi
    .fn()
    .mockReturnValue([
      { value: 'geral', label: 'Geral', content: <div>Geral</div> },
    ])
  const onSaveSection = vi.fn()

  it('renders ViewPortalDialog (not ViewDialog) when dialogs.view.portal is set, forwarding portal props + form.validation', async () => {
    renderListPage(
      makeConfig({
        view: {
          title: 'Detalhes',
          portal: {
            sections: portalSections,
            defaultSection: 'geral',
            columns: 3,
            onSaveSection,
          },
        },
      })
    )
    await openDialogs({
      view: {
        title: 'Detalhes',
        portal: {
          sections: portalSections,
          defaultSection: 'geral',
          columns: 3,
          onSaveSection,
        },
      },
    })

    expect(viewPortalDialogSpy).toHaveBeenCalled()
    expect(viewDialogSpy).not.toHaveBeenCalled()

    const props = viewPortalDialogSpy.mock.calls.at(-1)![0]
    expect(props.sections).toBe(portalSections)
    expect(props.defaultSection).toBe('geral')
    expect(props.columns).toBe(3)
    expect(props.onSaveSection).toBe(onSaveSection)
    expect(props.validation).toBe(formValidation)
    expect(props.title).toBe('Detalhes')
    // No footer/renderContent wiring — that's ViewDialog-only
    expect(props.renderContent).toBeUndefined()
  })

  it('renders ViewDialog (not ViewPortalDialog) when dialogs.view has no portal (old behavior intact)', async () => {
    renderListPage(
      makeConfig({
        view: { title: 'Detalhes', renderContent: () => <div>x</div> },
      })
    )
    await openDialogs({
      view: { title: 'Detalhes', renderContent: () => <div>x</div> },
    })

    expect(viewDialogSpy).toHaveBeenCalled()
    expect(viewPortalDialogSpy).not.toHaveBeenCalled()

    const props = viewDialogSpy.mock.calls.at(-1)![0]
    expect(typeof props.renderContent).toBe('function')
  })

  it('portal wins over renderContent when both are set, and warns in dev', async () => {
    const renderContent = vi.fn().mockReturnValue(<div>legacy</div>)
    renderListPage(
      makeConfig({
        view: {
          title: 'Detalhes',
          renderContent,
          portal: { sections: portalSections },
        },
      })
    )
    await openDialogs({
      view: {
        title: 'Detalhes',
        renderContent,
        portal: { sections: portalSections },
      },
    })

    expect(viewPortalDialogSpy).toHaveBeenCalled()
    expect(viewDialogSpy).not.toHaveBeenCalled()
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mutually exclusive')
    )
  })
})

describe('ListPage - view footer delete inherits standard.delete (#11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const viewDialogs = {
    view: { title: 'Detalhes', renderContent: () => <div>x</div> },
  }

  it('forwards label, icon and function confirm texts resolved with the item', async () => {
    const Icon = () => null
    const config = makeConfig(viewDialogs)
    config.actionsConfig = {
      standard: {
        delete: {
          label: 'Desativar',
          icon: Icon,
          confirmDialog: {
            title: (u: MockUser) => `Desativar ${u.name}?`,
            description: 'Perde acesso',
          },
        },
      },
    }
    renderListPage(config)
    await openDialogs(config.dialogs!)

    const props = viewDialogSpy.mock.calls.at(-1)![0]
    expect(props.deleteLabel).toBe('Desativar')
    expect(props.deleteIcon).toBe(Icon)
    expect(props.deleteConfirmation.title({ name: 'Ana' })).toBe(
      'Desativar Ana?'
    )
    expect(props.deleteConfirmation.description).toBe('Perde acesso')
  })

  it('without config keeps the defaults (no label/icon override)', async () => {
    const config = makeConfig(viewDialogs)
    config.actionsConfig = { standard: { delete: true } }
    renderListPage(config)
    await openDialogs(config.dialogs!)

    const props = viewDialogSpy.mock.calls.at(-1)![0]
    expect(props.deleteLabel).toBeUndefined()
    expect(props.deleteIcon).toBeUndefined()
    expect(props.deleteConfirmation).toBeUndefined()
  })

  it('forwards dialogs.*.description to the three dialogs', async () => {
    renderListPage(
      makeConfig({
        ...viewDialogs,
        view: { ...viewDialogs.view, description: 'V' },
        edit: { title: 'E', description: 'E desc' },
        create: { title: 'C', description: 'C desc' },
      })
    )
    await openDialogs({
      ...viewDialogs,
      view: { ...viewDialogs.view, description: 'V' },
      edit: { title: 'E', description: 'E desc' },
      create: { title: 'C', description: 'C desc' },
    })
    expect(viewDialogSpy.mock.calls.at(-1)![0].description).toBe('V')
    expect(editDialogSpy.mock.calls.at(-1)![0].description).toBe('E desc')
    expect(createDialogSpy.mock.calls.at(-1)![0].description).toBe('C desc')
  })
})
