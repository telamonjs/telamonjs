import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'
import { PermissionsProvider } from '../providers/PermissionsProvider'

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

const createDialogSpy = vi.fn()
vi.mock('../components/dialog/create-dialog', () => ({
  CreateDialog: (props: Record<string, unknown>) => {
    createDialogSpy(props)
    return null
  },
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
  onDelete?: () => Promise<void>
}
const viewProps = (): Footer =>
  viewDialogSpy.mock.calls.at(-1)?.[0] ?? { open: false }

const FETCHED: User = { id: '42', name: 'Alice' }

function makeConfig(
  over: Partial<CrudConfig<User, Partial<User>>> = {}
): CrudConfig<User, Partial<User>> {
  return {
    module: { name: 'users', title: 'Users', description: '', route: '/admin/users' },
    list: { title: 'Users', description: '', columns: [{ accessorKey: 'name', header: 'Name' }] },
    form: {
      sections: [
        { title: 'Dados', fields: [{ name: 'name', label: 'Nome', type: 'text' }] },
      ],
    },
    query: {
      queryKey: ['users'],
      queryFn: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 }),
    },
    mutations: {
      create: { mutationFn: vi.fn(), invalidates: [['users']] },
      update: { mutationFn: vi.fn(), invalidates: [['users']] },
      delete: { mutationFn: vi.fn(), invalidates: [['users']] },
      getForView: vi.fn().mockResolvedValue(FETCHED),
      getForEdit: vi.fn().mockResolvedValue(FETCHED),
    },
    actionsConfig: { standard: { delete: true } },
    dialogs: {
      create: { title: 'Novo', urlParam: 'create' },
      view: { title: 'Detalhes', urlParam: 'view', renderContent: () => null },
      edit: { title: 'Editar', urlParam: 'edit' },
    },
    ...over,
  }
}

function renderList(
  config: CrudConfig<User, Partial<User>>,
  providerCan?: (permission: string) => boolean
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider can={providerCan}>
        <ListPage<User> config={config} />
      </PermissionsProvider>
    </QueryClientProvider>
  )
}

describe('ListPage - CrudConfig.permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearch = ''
  })

  describe('Rendering', () => {
    it('without permissions the New button shows (unchanged behavior)', async () => {
      renderList(makeConfig())
      expect(await screen.findByTestId('toolbar-add-button')).toBeInTheDocument()
    })

    it('denied create hides the New button', async () => {
      renderList(
        makeConfig({ permissions: { create: 'users.create', can: () => false } })
      )
      await waitFor(() =>
        expect(screen.queryByTestId('toolbar-add-button')).not.toBeInTheDocument()
      )
    })

    it('granted create through userPermissions keeps it', async () => {
      renderList(
        makeConfig({
          permissions: { create: 'users.create' },
          actionsConfig: { userPermissions: ['users.create'] },
        })
      )
      expect(await screen.findByTestId('toolbar-add-button')).toBeInTheDocument()
    })

    it('no form (read-only list) hides the New button even with dialogs.create', async () => {
      renderList(makeConfig({ form: undefined }))
      await waitFor(() =>
        expect(screen.queryByTestId('toolbar-add-button')).not.toBeInTheDocument()
      )
    })
  })

  describe('State Management', () => {
    it('?create=1 deep link does not open a denied create dialog', async () => {
      currentSearch = 'create=1'
      renderList(
        makeConfig({ permissions: { create: 'users.create', can: () => false } })
      )
      await new Promise(r => setTimeout(r, 30))
      expect(createDialogSpy).not.toHaveBeenCalled()
    })

    it('view footer: Edit follows permissions.edit, Delete follows permissions.delete via `can`', async () => {
      currentSearch = 'view=42'
      renderList(
        makeConfig({
          permissions: {
            // superadmin-style checker: empty userPermissions, `can` decides
            can: perm => perm !== 'users.edit',
            edit: 'users.edit',
            delete: 'users.delete',
          },
          actionsConfig: { standard: { delete: true }, userPermissions: [] },
        })
      )
      await waitFor(() => expect(viewProps().open).toBe(true))
      expect(viewProps().onEdit).toBeUndefined()
      expect(viewProps().onDelete).toBeTypeOf('function')
    })
  })

  describe('PermissionsProvider', () => {
    it("the provider's `can` checks a config without its own checker", async () => {
      renderList(makeConfig({ permissions: { create: 'users.create' } }), () => false)
      await waitFor(() =>
        expect(screen.queryByTestId('toolbar-add-button')).not.toBeInTheDocument()
      )
    })

    it("the config's own `can` wins over the provider's", async () => {
      renderList(
        makeConfig({ permissions: { create: 'users.create', can: () => true } }),
        () => false
      )
      expect(await screen.findByTestId('toolbar-add-button')).toBeInTheDocument()
    })

    it("view footer: Edit follows the provider's `can`", async () => {
      currentSearch = 'view=42'
      renderList(
        makeConfig({ permissions: { edit: 'users.edit', delete: 'users.delete' } }),
        perm => perm !== 'users.edit'
      )
      await waitFor(() => expect(viewProps().open).toBe(true))
      expect(viewProps().onEdit).toBeUndefined()
      expect(viewProps().onDelete).toBeTypeOf('function')
    })

    it('a provider without `can` changes nothing', async () => {
      renderList(makeConfig({ permissions: { create: 'users.create' } }))
      expect(await screen.findByTestId('toolbar-add-button')).toBeInTheDocument()
    })
  })
})
