/**
 * Characterization tests for ListPage internal behaviors.
 *
 * These tests pin the CURRENT behavior of ListPage before/after the
 * decomposition into src/pages/list-page/ hooks + components:
 * - action handler overrides (edit/view/delete) injected into actionsConfig
 * - onAfterAction refresh semantics
 * - dialog open/close flows, including the view -> edit handoff
 * - ViewDialog delete (custom handler vs mutations fallback) + confirmation
 * - dialog data fetchers (getForView preference, getForEdit fallback)
 * - create/update submit wrappers
 * - URL sync (setParams payload + custom URL filters)
 * - infinite scroll vs paginated rendering switch
 */
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'
import { createPaginatedResponse } from '../types/pagination'
import type { BulkAction } from '../data/BulkActionsToolbar'

// Avoid loading @telamonjs/logger (published dist breaks Node ESM resolution)
vi.mock('../utils/logger', () => {
  const noop = () => undefined
  const mockLogger: Record<string, unknown> = {
    debug: noop,
    info: noop,
    warn: noop,
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

// Controllable useUrlSync mock (URL sync assertions)
const setParamsSpy = vi.fn()
let urlParams: Record<string, string> = {}
vi.mock('../hooks/useUrlSync', () => ({
  useUrlSync: () => ({
    getParam: (key: string) => urlParams[key] ?? null,
    getNumberParam: (key: string) =>
      urlParams[key] !== undefined ? Number(urlParams[key]) : undefined,
    hasParam: (key: string) => key in urlParams,
    setParam: vi.fn(),
    setParams: setParamsSpy,
  }),
}))

// Prop recorders for everything ListPage renders
const dataTableSpy = vi.fn()
vi.mock('../data/DataTable', () => ({
  DataTable: (props: Record<string, unknown>) => {
    dataTableSpy(props)
    return <div data-testid='datatable-mock' />
  },
}))

const infiniteListSpy = vi.fn()
vi.mock('../data/InfiniteList', () => ({
  InfiniteList: (props: Record<string, unknown>) => {
    infiniteListSpy(props)
    return <div data-testid='infinitelist-mock' />
  },
}))

const createDialogSpy = vi.fn()
const editDialogSpy = vi.fn()
const viewDialogSpy = vi.fn()

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

vi.mock('../components/dialog/view-dialog', () => ({
  ViewDialog: (props: Record<string, unknown>) => {
    viewDialogSpy(props)
    return null
  },
}))

interface MockUser {
  id: string
  name: string
  email: string
}

const mockData: MockUser[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
]

// Last props forwarded to a mocked child
function latest<T = Record<string, any>>(spy: ReturnType<typeof vi.fn>): T {
  expect(spy).toHaveBeenCalled()
  return spy.mock.calls.at(-1)![0] as T
}

// Dialogs are React.lazy + mounted on first open: wait for the (mocked) chunk and
// return the props of the latest render.
async function dialogProps<T = Record<string, any>>(
  spy: ReturnType<typeof vi.fn>
): Promise<T> {
  await waitFor(() => expect(spy).toHaveBeenCalled())
  return latest<T>(spy)
}
async function openViewDialog() {
  act(() => {
    latest(dataTableSpy).onRowClick(mockData[0])
  })
  return dialogProps(viewDialogSpy)
}
async function openEditDialog() {
  await act(async () => {
    await latest(dataTableSpy).actionsConfig.standard.edit.handler(mockData[0])
  })
  return dialogProps(editDialogSpy)
}
async function openCreateDialog() {
  act(() => {
    latest(dataTableSpy).onAdd()
  })
  return dialogProps(createDialogSpy)
}

// Unique route (= tableId) per test: the Zustand datatable-store persists
// across tests within the same file.
let routeCounter = 0

type UserCrudConfig = CrudConfig<MockUser, Partial<MockUser>>

interface MakeConfigOptions {
  queryFn?: ReturnType<typeof vi.fn>
  list?: Partial<UserCrudConfig['list']>
  dialogs?: UserCrudConfig['dialogs']
  actionsConfig?: UserCrudConfig['actionsConfig']
  getForEdit?: (id: string) => Promise<Partial<MockUser>>
  getForView?: (id: string) => Promise<MockUser>
}

function makeConfig(options: MakeConfigOptions = {}) {
  routeCounter += 1
  const route = `/admin/users-behaviors-${routeCounter}`
  const queryFn =
    options.queryFn ??
    vi
      .fn()
      .mockResolvedValue(
        createPaginatedResponse(mockData, mockData.length, 1, 10)
      )
  const createFn = vi.fn().mockResolvedValue({ success: true })
  const updateFn = vi.fn().mockResolvedValue({ success: true })
  const deleteFn = vi.fn().mockResolvedValue({ success: true })

  const config: UserCrudConfig = {
    module: { name: 'users', title: 'Users', route },
    list: {
      columns: [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'email', header: 'Email' },
      ],
      // Default to paginated DataTable so behavior tests (dialog wiring,
      // actionsConfig, URL sync, etc.) keep using dataTableSpy.
      // Infinite-specific tests override this below.
      infiniteScroll: false,
      ...options.list,
    },
    form: {
      sections: [
        {
          title: 'Dados',
          fields: [{ name: 'name', label: 'Nome', type: 'text' }],
        },
      ],
    },
    query: { queryKey: ['users', route], queryFn },
    mutations: {
      create: { mutationFn: createFn, invalidates: [] },
      update: { mutationFn: updateFn, invalidates: [] },
      delete: { mutationFn: deleteFn, invalidates: [] },
      ...(options.getForEdit ? { getForEdit: options.getForEdit } : {}),
      ...(options.getForView ? { getForView: options.getForView } : {}),
    },
    actionsConfig: options.actionsConfig,
    dialogs: options.dialogs,
  }

  return { config, queryFn, createFn, updateFn, deleteFn, route }
}

interface ExtraProps {
  embedded?: boolean
  urlSync?: boolean
  urlFilters?: Record<string, 'string' | 'number'>
  enableBulkActions?: boolean
  bulkActions?: BulkAction<MockUser>[]
}

function renderListPage(config: UserCrudConfig, extraProps: ExtraProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ListPage<MockUser> config={config} {...extraProps} />
    </QueryClientProvider>
  )
}

async function waitForInitialLoad(queryFn: ReturnType<typeof vi.fn>) {
  await waitFor(() => {
    expect(queryFn).toHaveBeenCalled()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  urlParams = {}
})

describe('ListPage behaviors (characterization)', () => {
  describe('Action handler overrides (finalActionsConfig)', () => {
    it('overrides the edit handler to open the EditDialog with the row id', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      expect(editDialogSpy).not.toHaveBeenCalled()

      const actionsConfig = latest(dataTableSpy).actionsConfig
      await act(async () => {
        const result = await actionsConfig.standard.edit.handler(mockData[0])
        expect(result).toEqual({ success: true })
      })

      const props = latest(editDialogSpy)
      expect(props.open).toBe(true)
      expect(props.id).toBe('1')
    })

    it('preserves custom edit action config (e.g. tooltip) while overriding the handler', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
        actionsConfig: {
          standard: { edit: { tooltip: 'Editar usuário' } },
        },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      const actionsConfig = latest(dataTableSpy).actionsConfig
      expect(actionsConfig.standard.edit.tooltip).toBe('Editar usuário')
      expect(typeof actionsConfig.standard.edit.handler).toBe('function')
    })

    it('overrides the view handler to open the ViewDialog with the row id', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      expect(viewDialogSpy).not.toHaveBeenCalled()

      const actionsConfig = latest(dataTableSpy).actionsConfig
      await act(async () => {
        await actionsConfig.standard.view.handler(mockData[1])
      })

      const props = latest(viewDialogSpy)
      expect(props.open).toBe(true)
      expect(props.id).toBe('2')
    })

    it('injects a delete handler backed by mutations.delete (invoked with the id)', async () => {
      const { config, queryFn, deleteFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
        actionsConfig: { standard: { delete: true } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      const actionsConfig = latest(dataTableSpy).actionsConfig
      await act(async () => {
        // DataTableActions invokes delete handlers with row.id (not the row)
        await actionsConfig.standard.delete.handler('7')
      })

      expect(deleteFn).toHaveBeenCalledWith({ id: '7' })
    })

    it('injects the delete handler even with no view/edit dialog configured', async () => {
      // Regression: useListPageActions used to early-return before wiring delete
      // when neither dialogs.edit nor dialogs.view was set, leaving the delete
      // row-action as a no-op (the original keys-tab revoke bug).
      const { config, queryFn, deleteFn } = makeConfig({
        actionsConfig: { standard: { delete: true } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      const actionsConfig = latest(dataTableSpy).actionsConfig
      expect(typeof actionsConfig.standard.delete.handler).toBe('function')
      await act(async () => {
        await actionsConfig.standard.delete.handler('7')
      })

      expect(deleteFn).toHaveBeenCalledWith({ id: '7' })
    })

    it('passes actionsConfig=undefined to DataTable when config.actionsConfig === false', async () => {
      const { config, queryFn } = makeConfig({ actionsConfig: false })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      expect(latest(dataTableSpy).actionsConfig).toBeUndefined()
    })

    it('builds an actionsConfig with onAfterAction even when none is provided', async () => {
      const { config, queryFn } = makeConfig()
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      const actionsConfig = latest(dataTableSpy).actionsConfig
      expect(actionsConfig).toBeDefined()
      expect(typeof actionsConfig.onAfterAction).toBe('function')
    })
  })

  describe('onAfterAction refresh semantics', () => {
    it('calls the original onAfterAction and refreshes on { success: true }', async () => {
      const originalOnAfterAction = vi.fn()
      const { config, queryFn } = makeConfig({
        actionsConfig: { onAfterAction: originalOnAfterAction, standard: {} },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      const callsBefore = queryFn.mock.calls.length

      const actionsConfig = latest(dataTableSpy).actionsConfig
      await act(async () => {
        await actionsConfig.onAfterAction('delete', mockData[0], {
          success: true,
        })
      })

      expect(originalOnAfterAction).toHaveBeenCalledWith(
        'delete',
        mockData[0],
        { success: true }
      )
      await waitFor(() => {
        expect(queryFn.mock.calls.length).toBeGreaterThan(callsBefore)
      })
    })

    it('does NOT refresh on explicit failure ({ success: false })', async () => {
      const { config, queryFn } = makeConfig({
        actionsConfig: { standard: {} },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      const callsBefore = queryFn.mock.calls.length

      const actionsConfig = latest(dataTableSpy).actionsConfig
      await act(async () => {
        await actionsConfig.onAfterAction('delete', mockData[0], {
          success: false,
        })
      })

      expect(queryFn.mock.calls.length).toBe(callsBefore)
    })

    it('refreshes when the handler resolves without a return value (custom actions)', async () => {
      const { config, queryFn } = makeConfig({
        actionsConfig: { standard: {} },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      const callsBefore = queryFn.mock.calls.length

      const actionsConfig = latest(dataTableSpy).actionsConfig
      await act(async () => {
        await actionsConfig.onAfterAction('publicar', mockData[0], undefined)
      })

      await waitFor(() => {
        expect(queryFn.mock.calls.length).toBeGreaterThan(callsBefore)
      })
    })
  })

  describe('Row click and view -> edit handoff', () => {
    it('opens the ViewDialog on row click when dialogs.view is configured', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      const onRowClick = latest(dataTableSpy).onRowClick
      expect(typeof onRowClick).toBe('function')

      act(() => {
        onRowClick(mockData[0])
      })

      const props = latest(viewDialogSpy)
      expect(props.open).toBe(true)
      expect(props.id).toBe('1')
    })

    it('does not wire onRowClick when dialogs.view is not configured', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      expect(latest(dataTableSpy).onRowClick).toBeUndefined()
    })

    it('hands off from ViewDialog to EditDialog with the same entity id', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: {
          view: { title: 'Ver', renderContent: () => null },
          edit: { title: 'Editar' },
        },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      // Open view for row 2
      act(() => {
        latest(dataTableSpy).onRowClick(mockData[1])
      })
      expect(latest(viewDialogSpy).open).toBe(true)
      expect(latest(viewDialogSpy).id).toBe('2')

      // Trigger Edit from inside the ViewDialog
      act(() => {
        latest(viewDialogSpy).onEdit()
      })

      expect(latest(viewDialogSpy).open).toBe(false)
      const editProps = latest(editDialogSpy)
      expect(editProps.open).toBe(true)
      expect(editProps.id).toBe('2')
    })

    it('passes onEdit=undefined to ViewDialog when no edit dialog is configured', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openViewDialog()

      expect(latest(viewDialogSpy).onEdit).toBeUndefined()
    })
  })

  describe('ViewDialog delete', () => {
    it('falls back to mutations.delete and refreshes when no custom handler exists', async () => {
      const { config, queryFn, deleteFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        actionsConfig: { standard: { delete: true } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      act(() => {
        latest(dataTableSpy).onRowClick(mockData[0])
      })
      const callsBefore = queryFn.mock.calls.length

      await act(async () => {
        await latest(viewDialogSpy).onDelete()
      })

      expect(deleteFn).toHaveBeenCalledWith({ id: '1' })
      await waitFor(() => {
        expect(queryFn.mock.calls.length).toBeGreaterThan(callsBefore)
      })
    })

    it('uses the custom delete handler with the row data when provided', async () => {
      const customDelete = vi.fn().mockResolvedValue({ success: true })
      const { config, queryFn, deleteFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        actionsConfig: { standard: { delete: { handler: customDelete } } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      // Wait for data so the row lookup inside the delete handler succeeds
      await waitFor(() => {
        expect(latest(dataTableSpy).data).toHaveLength(2)
      })

      act(() => {
        latest(dataTableSpy).onRowClick(mockData[0])
      })

      await act(async () => {
        await latest(viewDialogSpy).onDelete()
      })

      expect(customDelete).toHaveBeenCalledWith(mockData[0])
      expect(deleteFn).not.toHaveBeenCalled()
    })

    it('does not refresh when the custom delete handler fails', async () => {
      const customDelete = vi.fn().mockResolvedValue({ success: false })
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        actionsConfig: { standard: { delete: { handler: customDelete } } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await waitFor(() => {
        expect(latest(dataTableSpy).data).toHaveLength(2)
      })

      act(() => {
        latest(dataTableSpy).onRowClick(mockData[0])
      })
      const callsBefore = queryFn.mock.calls.length

      await act(async () => {
        await latest(viewDialogSpy).onDelete()
      })

      expect(customDelete).toHaveBeenCalled()
      expect(queryFn.mock.calls.length).toBe(callsBefore)
    })

    it('passes onDelete=undefined when actionsConfig has no delete action', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openViewDialog()

      expect(latest(viewDialogSpy).onDelete).toBeUndefined()
    })

    it('maps string confirmDialog title/description to deleteConfirmation', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        actionsConfig: {
          standard: {
            delete: {
              confirmDialog: { title: 'Excluir?', description: 'Sem volta.' },
            },
          },
        },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openViewDialog()

      expect(latest(viewDialogSpy).deleteConfirmation).toEqual({
        title: 'Excluir?',
        description: 'Sem volta.',
      })
    })

    it('resolves function confirmDialog texts with the viewed item (#11)', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        actionsConfig: {
          standard: {
            delete: {
              confirmDialog: {
                title: (row: MockUser) => `Excluir ${row.name}?`,
                description: (row: MockUser) => `Remove ${row.name}.`,
              },
            },
          },
        },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openViewDialog()

      const confirm = latest(viewDialogSpy).deleteConfirmation as {
        title: (row: MockUser) => string
        description: (row: MockUser) => string
      }
      const row = { id: '1', name: 'Ana', email: 'a@x.com' } as MockUser
      expect(confirm.title(row)).toBe('Excluir Ana?')
      expect(confirm.description(row)).toBe('Remove Ana.')
    })

    it('passes deleteConfirmation=undefined when confirmDialog is not an object', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        actionsConfig: { standard: { delete: true } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openViewDialog()

      expect(latest(viewDialogSpy).deleteConfirmation).toBeUndefined()
    })
  })

  describe('Dialog data fetchers and submit wrappers', () => {
    it('ViewDialog fetchAction prefers mutations.getForView', async () => {
      const getForView = vi.fn().mockResolvedValue(mockData[0])
      const getForEdit = vi.fn().mockResolvedValue(mockData[0])
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        getForView,
        getForEdit,
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openViewDialog()

      await act(async () => {
        await latest(viewDialogSpy).fetchAction('1')
      })

      expect(getForView).toHaveBeenCalledWith('1')
      expect(getForEdit).not.toHaveBeenCalled()
    })

    it('ViewDialog fetchAction falls back to mutations.getForEdit', async () => {
      const getForEdit = vi.fn().mockResolvedValue(mockData[0])
      const { config, queryFn } = makeConfig({
        dialogs: { view: { title: 'Ver', renderContent: () => null } },
        getForEdit,
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openViewDialog()

      await act(async () => {
        await latest(viewDialogSpy).fetchAction('1')
      })

      expect(getForEdit).toHaveBeenCalledWith('1')
    })

    it('EditDialog fetchAction uses mutations.getForEdit and rejects without it', async () => {
      const getForEdit = vi.fn().mockResolvedValue(mockData[0])
      const { config, queryFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
        getForEdit,
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openEditDialog()

      await act(async () => {
        await latest(editDialogSpy).fetchAction('1')
      })
      expect(getForEdit).toHaveBeenCalledWith('1')
    })

    it('EditDialog fetchAction throws when mutations.getForEdit is missing', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openEditDialog()

      await expect(latest(editDialogSpy).fetchAction('1')).rejects.toThrow(
        'getForEdit is required'
      )
    })

    it('EditDialog onSubmitValues splits id from data for the update mutation', async () => {
      const { config, queryFn, updateFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openEditDialog()

      await act(async () => {
        await latest(editDialogSpy).onSubmitValues({ id: '9', name: 'Novo' })
      })

      expect(updateFn).toHaveBeenCalledWith({ id: '9', data: { name: 'Novo' } })
    })

    it('EditDialog onSubmitValues throws when id is missing', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openEditDialog()

      await expect(
        latest(editDialogSpy).onSubmitValues({ name: 'Sem id' })
      ).rejects.toThrow('Missing id in submit values')
    })

    it('CreateDialog onSubmitValues passes values straight to the create mutation', async () => {
      const { config, queryFn, createFn } = makeConfig({
        dialogs: { create: { title: 'Novo' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openCreateDialog()

      await act(async () => {
        await latest(createDialogSpy).onSubmitValues({ name: 'Criado' })
      })

      expect(createFn).toHaveBeenCalledWith({ name: 'Criado' })
    })
  })

  describe('Dialog success flows (refresh)', () => {
    it('refreshes the list and closes the CreateDialog on success', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { create: { title: 'Novo' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      // Open create dialog via DataTable onAdd
      act(() => {
        latest(dataTableSpy).onAdd()
      })
      expect(latest(createDialogSpy).open).toBe(true)
      const callsBefore = queryFn.mock.calls.length

      await act(async () => {
        await latest(createDialogSpy).onSuccess()
      })

      await waitFor(() => {
        expect(queryFn.mock.calls.length).toBeGreaterThan(callsBefore)
      })
      expect(latest(createDialogSpy).open).toBe(false)
    })

    it('refreshes the list when the EditDialog reports success', async () => {
      const { config, queryFn } = makeConfig({
        dialogs: { edit: { title: 'Editar' } },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)
      await openEditDialog()
      const callsBefore = queryFn.mock.calls.length

      await act(async () => {
        await latest(editDialogSpy).onSuccess()
      })

      await waitFor(() => {
        expect(queryFn.mock.calls.length).toBeGreaterThan(callsBefore)
      })
    })
  })

  describe('URL sync', () => {
    it('pushes pagination state to the URL when urlSync=true', async () => {
      const { config, queryFn } = makeConfig()
      renderListPage(config, { urlSync: true })
      await waitForInitialLoad(queryFn)

      await waitFor(() => {
        expect(setParamsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1, pageSize: 10 }),
          { replace: true }
        )
      })
    })

    it('does not touch the URL when urlSync is disabled (default)', async () => {
      const { config, queryFn } = makeConfig()
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      expect(setParamsSpy).not.toHaveBeenCalled()
    })

    it('extracts urlFilters from the URL and forwards them to the query and URL', async () => {
      urlParams = { status: 'ativo', categoria: '3' }
      const { config, queryFn } = makeConfig()
      renderListPage(config, {
        urlSync: true,
        urlFilters: { status: 'string', categoria: 'number' },
      })

      await waitFor(() => {
        expect(queryFn).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({ status: 'ativo', categoria: 3 }),
          })
        )
      })

      await waitFor(() => {
        expect(setParamsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'ativo', categoria: 3 }),
          { replace: true }
        )
      })
    })
  })

  describe('Infinite scroll vs paginated rendering', () => {
    // Default: infinite scroll is active for ALL ListPage instances.
    // Opt-out with list.infiniteScroll === false to get classic DataTable.

    it('forwards the query error + retry to InfiniteList (consumer QA 7.3.1: 500 showed the empty state)', async () => {
      const { config } = makeConfig({
        list: { infiniteScroll: undefined },
        queryFn: vi.fn().mockRejectedValue(new Error('Internal Server Error')),
      })
      renderListPage(config)
      await waitFor(() => {
        expect(latest(infiniteListSpy).error).toBe('Internal Server Error')
      })
      expect(typeof latest(infiniteListSpy).onRetry).toBe('function')
    })

    it('empty copy: "no results" with an active search, "start adding" otherwise', async () => {
      const { config } = makeConfig({ list: { infiniteScroll: undefined } })
      renderListPage(config)
      await waitFor(() => expect(infiniteListSpy).toHaveBeenCalled())
      expect(latest(infiniteListSpy).emptyDescription).toBe(
        'Comece adicionando um novo item.'
      )

      await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'zzz')
      await waitFor(() => {
        expect(latest(infiniteListSpy).emptyTitle).toBe(
          'Nenhum resultado encontrado'
        )
        expect(latest(infiniteListSpy).emptyDescription).toBe(
          'Tente ajustar a busca ou os filtros.'
        )
      })
    })

    it('renders InfiniteList by default (no infiniteScroll flag)', async () => {
      const { config } = makeConfig({
        // Override the makeConfig default (infiniteScroll:false) to test the
        // library default (no flag = infinite).
        list: { infiniteScroll: undefined },
      })
      renderListPage(config)

      await waitFor(() => {
        expect(screen.getByTestId('infinitelist-mock')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('datatable-mock')).not.toBeInTheDocument()
    })

    it('renders InfiniteList when embedded with default (no infiniteScroll flag)', async () => {
      const { config } = makeConfig({
        list: { infiniteScroll: undefined },
      })
      renderListPage(config, { embedded: true })

      await waitFor(() => {
        expect(screen.getByTestId('infinitelist-mock')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('datatable-mock')).not.toBeInTheDocument()
    })

    it('renders InfiniteList (not DataTable) when infiniteScroll is explicitly true', async () => {
      const { config } = makeConfig({
        list: { infiniteScroll: true },
      })
      renderListPage(config, { embedded: true })

      await waitFor(() => {
        expect(screen.getByTestId('infinitelist-mock')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('datatable-mock')).not.toBeInTheDocument()
      expect(dataTableSpy).not.toHaveBeenCalled()
    })

    it('forwards enableBulkActions/bulkActions to InfiniteList as enableSelection/bulkActions', async () => {
      const bulkActions: BulkAction<MockUser>[] = [
        { id: 'deferir', label: 'Deferir selecionadas', handler: vi.fn() },
      ]
      const { config } = makeConfig({ list: { infiniteScroll: true } })
      renderListPage(config, {
        embedded: true,
        enableBulkActions: true,
        bulkActions,
      })

      await waitFor(() => {
        expect(screen.getByTestId('infinitelist-mock')).toBeInTheDocument()
      })
      expect(infiniteListSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enableSelection: true,
          bulkActions: [
            expect.objectContaining({
              id: 'deferir',
              label: 'Deferir selecionadas',
            }),
          ],
        })
      )
    })

    it('refetches the list after a bulk action handler succeeds (and not when it fails)', async () => {
      const okHandler = vi
        .fn()
        .mockResolvedValue({ success: true, message: 'ok' })
      const failHandler = vi
        .fn()
        .mockResolvedValue({ success: false, message: 'nope' })
      const bulkActions: BulkAction<MockUser>[] = [
        { id: 'ok', label: 'Ok', handler: okHandler },
        { id: 'fail', label: 'Fail', handler: failHandler },
      ]
      const { config, queryFn } = makeConfig({ list: { infiniteScroll: true } })
      renderListPage(config, {
        embedded: true,
        enableBulkActions: true,
        bulkActions,
      })
      await waitForInitialLoad(queryFn)

      await waitFor(() => {
        expect(screen.getByTestId('infinitelist-mock')).toBeInTheDocument()
      })
      const forwarded = infiniteListSpy.mock.lastCall?.[0]
        .bulkActions as BulkAction<MockUser>[]
      const refetchCalls = () => queryFn.mock.calls.length

      const before = refetchCalls()
      await act(async () => {
        await forwarded[0].handler([])
      })
      expect(okHandler).toHaveBeenCalledWith([])
      expect(refetchCalls()).toBe(before + 1)

      await act(async () => {
        await forwarded[1].handler([])
      })
      expect(failHandler).toHaveBeenCalled()
      expect(refetchCalls()).toBe(before + 1)
    })

    it('does not enable selection on InfiniteList when enableBulkActions is off', async () => {
      const { config } = makeConfig({ list: { infiniteScroll: true } })
      renderListPage(config, { embedded: true })

      await waitFor(() => {
        expect(screen.getByTestId('infinitelist-mock')).toBeInTheDocument()
      })
      expect(infiniteListSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ enableSelection: false, bulkActions: [] })
      )
    })

    it('renders DataTable (opt-out) when infiniteScroll is explicitly false', async () => {
      // makeConfig already sets infiniteScroll:false by default; this test
      // verifies the opt-out explicitly for documentation purposes.
      const { config, queryFn } = makeConfig({
        list: { infiniteScroll: false },
      })
      renderListPage(config)
      await waitForInitialLoad(queryFn)

      expect(screen.getByTestId('datatable-mock')).toBeInTheDocument()
      expect(screen.queryByTestId('infinitelist-mock')).not.toBeInTheDocument()
    })

    it('renders DataTable (opt-out) when embedded and infiniteScroll is false', async () => {
      const { config, queryFn } = makeConfig({
        list: { infiniteScroll: false },
      })
      renderListPage(config, { embedded: true })
      await waitForInitialLoad(queryFn)

      expect(screen.getByTestId('datatable-mock')).toBeInTheDocument()
      expect(screen.queryByTestId('infinitelist-mock')).not.toBeInTheDocument()
    })
  })
  /**
   * Regression: `showCounter` was `list.toolbar?.showCounter && ...`, i.e. it
   * required an explicit `true`, while the type documents "default: true" and
   * its sibling `showRefresh` — 12 lines below, in the same file — has always
   * been `!== false`. Result: every `counterLabel` declared without
   * `showCounter` was dead code and no counter ever appeared. These tests pin
   * the default and the opt-out.
   */
  describe('toolbar counter', () => {
    it('mostra o contador por default, sem showCounter declarado', async () => {
      const { config, queryFn } = makeConfig({
        list: { infiniteScroll: true, toolbar: {} },
      })
      renderListPage(config, { embedded: true })
      await waitForInitialLoad(queryFn)

      await waitFor(() => {
        expect(screen.getByText(/2 resultados/)).toBeInTheDocument()
      })
    })

    it('honra counterLabel, inclusive como funcao', async () => {
      const { config, queryFn } = makeConfig({
        list: {
          infiniteScroll: true,
          toolbar: {
            counterLabel: (count: number) =>
              count === 1 ? 'usuario' : 'usuarios',
          },
        },
      })
      renderListPage(config, { embedded: true })
      await waitForInitialLoad(queryFn)

      await waitFor(() => {
        expect(screen.getByText(/2 usuarios/)).toBeInTheDocument()
      })
    })

    it('esconde o contador com showCounter: false (opt-out preservado)', async () => {
      const { config, queryFn } = makeConfig({
        list: { infiniteScroll: true, toolbar: { showCounter: false } },
      })
      renderListPage(config, { embedded: true })
      await waitForInitialLoad(queryFn)

      expect(screen.queryByText(/resultados/)).not.toBeInTheDocument()
    })
  })
})
