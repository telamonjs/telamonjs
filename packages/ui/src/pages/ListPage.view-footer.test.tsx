import { act, render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'
import type { DataTableActionsConfig } from '../types/actions'

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

let currentSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

vi.mock('../data/DataTable', () => ({
  DataTable: () => <div data-testid='datatable-mock' />,
}))

const viewDialogSpy = vi.fn()
vi.mock('../components/dialog/view-dialog', () => ({
  ViewDialog: (props: Record<string, unknown>) => {
    viewDialogSpy(props)
    return null
  },
}))

// jsdom has no layout → offsetParent is always null. Emulate visibility so
// useDialogUrlSync's gate can be exercised: an element is "visible" unless it
// (or an ancestor) has inline `display: none` (how keep-alive tabs hide content).
let originalOffsetParent: PropertyDescriptor | undefined
beforeAll(() => {
  originalOffsetParent = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent'
  )
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      let el: HTMLElement | null = this
      while (el) {
        if (el.style?.display === 'none') return null
        el = el.parentElement
      }
      return document.body
    },
  })
})
afterAll(() => {
  if (originalOffsetParent) {
    Object.defineProperty(
      HTMLElement.prototype,
      'offsetParent',
      originalOffsetParent
    )
  }
})

interface User {
  id: string
  name: string
}

type Footer = {
  open: boolean
  onEdit?: () => void
  canEdit?: (item: User) => boolean
  onDelete?: () => Promise<void>
  canDelete?: (item: User) => boolean
}
const viewProps = (): Footer =>
  viewDialogSpy.mock.calls.at(-1)?.[0] ?? { open: false }

const FETCHED: User = { id: '42', name: 'Alice' }

function makeConfig(
  actionsConfig: DataTableActionsConfig<User> | undefined,
  rows: User[] = []
): CrudConfig<User, Partial<User>> {
  return {
    module: { name: 'users', title: 'Users', route: '/admin/users' },
    list: { columns: [{ accessorKey: 'name', header: 'Name' }] },
    form: {
      sections: [
        { title: 'Dados', fields: [{ name: 'name', label: 'Nome', type: 'text' }] },
      ],
    },
    query: {
      queryKey: ['users'],
      queryFn: vi.fn().mockResolvedValue({
        data: rows,
        meta: { total: rows.length, page: 1, limit: 10 },
      }),
    },
    mutations: {
      create: { mutationFn: vi.fn(), invalidates: [['users']] },
      update: { mutationFn: vi.fn(), invalidates: [['users']] },
      delete: { mutationFn: vi.fn(), invalidates: [['users']] },
      getForView: vi.fn().mockResolvedValue(FETCHED),
      getForEdit: vi.fn().mockResolvedValue(FETCHED),
    },
    actionsConfig,
    dialogs: {
      view: { title: 'Detalhes', urlParam: 'view', renderContent: () => null },
      edit: { title: 'Editar', urlParam: 'edit' },
    },
  }
}

async function openView(config: CrudConfig<User, Partial<User>>) {
  currentSearch = 'view=42'
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ListPage<User> config={config} />
    </QueryClientProvider>
  )
  await waitFor(() => expect(viewProps().open).toBe(true))
  return queryClient
}

describe('ListPage - view dialog footer follows the row actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearch = ''
  })

  it('edit absent: footer Edit offered, no per-record gate (the row edit is injected too)', async () => {
    await openView(makeConfig(undefined))
    expect(viewProps().onEdit).toBeTypeOf('function')
    expect(viewProps().canEdit).toBeUndefined()
    expect(viewProps().onDelete).toBeUndefined()
  })

  it('edit: false hides the footer Edit, like the row', async () => {
    await openView(makeConfig({ standard: { edit: false } }))
    expect(viewProps().onEdit).toBeUndefined()
  })

  it('permission: footer actions only for users holding it', async () => {
    await openView(
      makeConfig({
        standard: {
          edit: { permission: 'users.write' },
          delete: { permission: ['users.delete', 'users.admin'] },
        },
        userPermissions: ['users.read', 'users.admin'],
      })
    )
    expect(viewProps().onEdit).toBeUndefined()
    expect(viewProps().onDelete).toBeTypeOf('function')
  })

  it('no userPermissions: everything allowed (same as the row)', async () => {
    await openView(
      makeConfig({ standard: { edit: { permission: 'users.write' } } })
    )
    expect(viewProps().onEdit).toBeTypeOf('function')
  })

  it('visible/enabled are evaluated against the LIST row when it is loaded', async () => {
    const rows = [{ id: '42', name: 'Bloqueada' }]
    await openView(
      makeConfig(
        {
          standard: {
            edit: { visible: u => u.name !== 'Bloqueada' },
            delete: { enabled: u => u.name !== 'Bloqueada' },
          },
        },
        rows
      )
    )
    await waitFor(() => {
      expect(viewProps().canEdit?.(FETCHED)).toBe(false)
    })
    expect(viewProps().canDelete?.(FETCHED)).toBe(false)
  })

  it('deep link outside the loaded page: falls back to the fetched record', async () => {
    await openView(
      makeConfig({
        standard: {
          edit: { visible: u => u.name !== 'Bloqueada' },
          delete: { visible: false },
        },
      })
    )
    const canEdit = viewProps().canEdit!
    expect(canEdit(FETCHED)).toBe(true)
    expect(canEdit({ id: '42', name: 'Bloqueada' })).toBe(false)
    expect(viewProps().canDelete?.(FETCHED)).toBe(false)
  })

  it('footer Edit still hands over to the edit dialog', async () => {
    await openView(makeConfig({ standard: { edit: { permission: 'users.write' } }, userPermissions: ['users.write'] }))
    act(() => viewProps().onEdit!())
    await waitFor(() => expect(viewProps().open).toBe(false))
  })
})
