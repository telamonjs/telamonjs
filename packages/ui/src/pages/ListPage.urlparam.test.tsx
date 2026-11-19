import { StrictMode } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ListPage } from './ListPage'
import type { CrudConfig } from '../types/crud'
import { DIALOG_CLOSE_URL_DELAY_MS } from './list-page/useDialogUrlSync'

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

// Controllable next/navigation mock (search params + router spies)
const routerReplaceSpy = vi.fn()
const routerPushSpy = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushSpy,
    replace: routerReplaceSpy,
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

vi.mock('../data/DataTable', () => ({
  DataTable: () => <div data-testid='datatable-mock' />,
}))

// ViewDialog prop recorder
const viewDialogSpy = vi.fn()
vi.mock('../components/dialog/view-dialog', () => ({
  ViewDialog: (props: Record<string, unknown>) => {
    viewDialogSpy(props)
    return null
  },
}))
const createDialogSpy = vi.fn()
vi.mock('../components/dialog/create-dialog', () => ({
  CreateDialog: (props: Record<string, unknown>) => {
    createDialogSpy(props)
    return null
  },
}))
const editDialogSpy = vi.fn()
vi.mock('../components/dialog/edit-dialog', () => ({
  EditDialog: (props: Record<string, unknown>) => {
    editDialogSpy(props)
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

interface MockUser {
  id: string
  name: string
}

function makeConfig(
  view: NonNullable<CrudConfig<MockUser, Partial<MockUser>>['dialogs']>['view']
): CrudConfig<MockUser, Partial<MockUser>> {
  return {
    module: { name: 'users', title: 'Users', route: '/admin/users' },
    list: {
      columns: [{ accessorKey: 'name', header: 'Name' }],
    },
    form: {
      sections: [
        {
          title: 'Dados',
          fields: [{ name: 'name', label: 'Nome', type: 'text' }],
        },
      ],
    },
    query: {
      queryKey: ['users'],
      queryFn: vi.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      }),
    },
    mutations: {
      create: { mutationFn: vi.fn(), invalidates: [['users']] },
      update: { mutationFn: vi.fn(), invalidates: [['users']] },
      delete: { mutationFn: vi.fn(), invalidates: [['users']] },
      getForView: vi.fn().mockResolvedValue({ id: '42', name: 'Alice' }),
    },
    dialogs: { view },
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

describe('ListPage - dialogs.view.urlParam deep-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearch = ''
  })

  it('opens the view dialog on mount when the param is present in the URL', async () => {
    currentSearch = 'view=42'
    renderListPage(
      makeConfig({
        title: 'Detalhes',
        urlParam: 'view',
        renderContent: () => null,
      })
    )

    await waitFor(() => {
      const props = viewDialogSpy.mock.calls.at(-1)![0]
      expect(props.open).toBe(true)
      expect(props.id).toBe('42')
    })
  })

  it('does not open the view dialog when the param is absent', () => {
    renderListPage(
      makeConfig({
        title: 'Detalhes',
        urlParam: 'view',
        renderContent: () => null,
      })
    )

    const props = viewDialogSpy.mock.calls.at(-1)?.[0] ?? { open: false }
    expect(props.open).toBe(false)
  })

  it('does not clear a deep-link param on initial mount (no spurious replace)', async () => {
    currentSearch = 'view=42'
    renderListPage(
      makeConfig({
        title: 'Detalhes',
        urlParam: 'view',
        renderContent: () => null,
      })
    )

    await waitFor(() => {
      const props = viewDialogSpy.mock.calls.at(-1)![0]
      expect(props.open).toBe(true)
    })
    // The sync effect must never have replaced the URL to a state WITHOUT the
    // param while the deep-link was being applied.
    const clearedCalls = routerReplaceSpy.mock.calls.filter(
      ([url]) => !String(url).includes('view=42')
    )
    expect(clearedCalls).toHaveLength(0)
  })

  // Regression: under React StrictMode (Next.js dev default) the sync effect is
  // double-invoked on mount. The second pass must NOT see urlChanged=false with
  // the dialog still closed and fall into the state→URL branch, clearing the
  // freshly-arrived deep-link param (which left the dialog never opening).
  it('opens the deep-link dialog under StrictMode (double-invoked effects)', async () => {
    currentSearch = 'view=42'
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ListPage<MockUser>
            config={makeConfig({
              title: 'Detalhes',
              urlParam: 'view',
              renderContent: () => null,
            })}
          />
        </QueryClientProvider>
      </StrictMode>
    )

    await waitFor(() => {
      const props = viewDialogSpy.mock.calls.at(-1)![0]
      expect(props.open).toBe(true)
      expect(props.id).toBe('42')
    })
    const clearedCalls = routerReplaceSpy.mock.calls.filter(
      ([url]) => !String(url).includes('view=42')
    )
    expect(clearedCalls).toHaveLength(0)
  })

  it('ignores the URL param when urlParam is not configured', () => {
    currentSearch = 'view=42'
    renderListPage(makeConfig({ title: 'Detalhes', renderContent: () => null }))

    const props = viewDialogSpy.mock.calls.at(-1)?.[0] ?? { open: false }
    expect(props.open).toBe(false)
    expect(routerReplaceSpy).not.toHaveBeenCalled()
  })

  it('writes the param via router.replace when the dialog opens from URL', async () => {
    currentSearch = 'view=42'
    renderListPage(
      makeConfig({
        title: 'Detalhes',
        urlParam: 'view',
        renderContent: () => null,
      })
    )

    // After mount-open, the state→URL effect sees current === '42' (no-op).
    // Simulate stale URL (param removed externally) is out of scope here;
    // the key behavior: no push (history) calls are made for dialog state.
    await waitFor(() => {
      const props = viewDialogSpy.mock.calls.at(-1)![0]
      expect(props.open).toBe(true)
    })
    expect(routerPushSpy).not.toHaveBeenCalled()
  })

  it('clears the param via router.replace when the dialog closes', async () => {
    currentSearch = 'view=42'
    renderListPage(
      makeConfig({
        title: 'Detalhes',
        urlParam: 'view',
        renderContent: () => null,
      })
    )

    await waitFor(() => {
      const props = viewDialogSpy.mock.calls.at(-1)![0]
      expect(props.open).toBe(true)
    })

    // Close via the onOpenChange handler forwarded to ViewDialog
    const props = viewDialogSpy.mock.calls.at(-1)![0]
    const onOpenChange = props.onOpenChange as (open: boolean) => void
    act(() => onOpenChange(false))

    await waitFor(() => {
      expect(routerReplaceSpy).toHaveBeenCalledWith('/admin/users', {
        scroll: false,
      })
    })
  })
})

// ── bidirectional sync + edit/create deep-link ──

type Dialogs = NonNullable<CrudConfig<MockUser, Partial<MockUser>>['dialogs']>

function makeFullConfig(
  dialogs: Dialogs
): CrudConfig<MockUser, Partial<MockUser>> {
  return {
    module: { name: 'users', title: 'Users', route: '/admin/users' },
    list: { columns: [{ accessorKey: 'name', header: 'Name' }] },
    form: {
      sections: [
        {
          title: 'Dados',
          fields: [{ name: 'name', label: 'Nome', type: 'text' }],
        },
      ],
    },
    query: {
      queryKey: ['users'],
      queryFn: vi.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      }),
    },
    mutations: {
      create: { mutationFn: vi.fn(), invalidates: [['users']] },
      update: { mutationFn: vi.fn(), invalidates: [['users']] },
      delete: { mutationFn: vi.fn(), invalidates: [['users']] },
      getForView: vi.fn().mockResolvedValue({ id: '42', name: 'Alice' }),
      getForEdit: vi.fn().mockResolvedValue({ id: '42', name: 'Alice' }),
    },
    dialogs,
  }
}

function renderFull(config: CrudConfig<MockUser, Partial<MockUser>>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // Fresh element on every render so React always reconciles ListPage and
  // re-reads the mocked searchParams (simulating client-side navigation).
  const element = () => (
    <QueryClientProvider client={queryClient}>
      <ListPage<MockUser> config={config} />
    </QueryClientProvider>
  )
  const result = render(element())
  const navigate = (search: string) => {
    currentSearch = search
    result.rerender(element())
  }
  return { ...result, navigate }
}

// Dialogs are lazy and only mount on first open: "never rendered" reads as closed
const viewProps = () => viewDialogSpy.mock.calls.at(-1)?.[0] ?? { open: false }
const editProps = () => editDialogSpy.mock.calls.at(-1)?.[0] ?? { open: false }
const createProps = () =>
  createDialogSpy.mock.calls.at(-1)?.[0] ?? { open: false }

describe('ListPage - dialog URL sync (v4.28.0)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearch = ''
  })

  it('reacts to back/forward: URL → state after mount', async () => {
    const config = makeFullConfig({
      view: { title: 'Detalhes', urlParam: 'view', renderContent: () => null },
    })
    const { navigate } = renderFull(config)

    // Closed initially
    expect(viewProps().open).toBe(false)

    // Forward-nav adds ?view=42 → dialog opens
    navigate('view=42')
    await waitFor(() => {
      expect(viewProps().open).toBe(true)
      expect(viewProps().id).toBe('42')
    })

    // Back-nav removes the param → dialog closes
    navigate('')
    await waitFor(() => {
      expect(viewProps().open).toBe(false)
    })
  })

  it('opens the edit dialog from ?edit=<id>', async () => {
    currentSearch = 'edit=7'
    renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
        edit: { title: 'Editar', urlParam: 'edit' },
      })
    )
    await waitFor(() => {
      expect(editProps().open).toBe(true)
      expect(editProps().id).toBe('7')
    })
    expect(viewProps().open).toBe(false)
  })

  it('opens the create dialog from the ?create=1 sentinel', async () => {
    currentSearch = 'create=1'
    renderFull(
      makeFullConfig({
        create: { title: 'Novo', urlParam: 'create' },
      })
    )
    await waitFor(() => {
      expect(createProps().open).toBe(true)
    })
  })

  it('applies precedence edit > view when both params are present', async () => {
    currentSearch = 'view=1&edit=2'
    renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
        edit: { title: 'Editar', urlParam: 'edit' },
      })
    )
    await waitFor(() => {
      expect(editProps().open).toBe(true)
      expect(editProps().id).toBe('2')
    })
    expect(viewProps().open).toBe(false)
  })

  it('preserves sibling params (?tab, ?page) when the dialog closes', async () => {
    currentSearch = 'tab=produtos&page=2&view=42'
    renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
      })
    )
    await waitFor(() => {
      expect(viewProps().open).toBe(true)
    })

    act(() => viewProps().onOpenChange(false))

    await waitFor(() => {
      const replaced = routerReplaceSpy.mock.calls.map(([url]) => String(url))
      const last = replaced.at(-1)!
      expect(last).toContain('tab=produtos')
      expect(last).toContain('page=2')
      expect(last).not.toContain('view=42')
    })
  })

  it('view → edit handoff rewrites the URL atomically via push (edit has urlParam)', async () => {
    currentSearch = 'view=42'
    renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
        edit: { title: 'Editar', urlParam: 'edit' },
      })
    )
    await waitFor(() => {
      expect(viewProps().open).toBe(true)
    })

    // ViewDialog.onEdit triggers the handoff
    act(() => viewProps().onEdit())

    await waitFor(() => {
      expect(editProps().open).toBe(true)
      expect(editProps().id).toBe('42')
    })
    expect(viewProps().open).toBe(false)

    // Switching to a URL-representable dialog (edit has urlParam) pushes a new
    // history entry (so Back returns to the view) and rewrites ?view→?edit in one
    // navigation.
    const last = routerPushSpy.mock.calls.map(([url]) => String(url)).at(-1)!
    expect(last).toContain('edit=42')
    expect(last).not.toContain('view=42')
  })

  it('opening a dialog pushes a history entry, so Back closes it', async () => {
    // Open via the view→edit handoff (a state→URL transition we can drive in the
    // test). The handoff to a urlParam-backed dialog must `push`, not `replace`.
    currentSearch = 'view=42'
    const { navigate } = renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
        edit: { title: 'Editar', urlParam: 'edit' },
      })
    )
    await waitFor(() => {
      expect(viewProps().open).toBe(true)
    })

    act(() => viewProps().onEdit())
    await waitFor(() => {
      expect(editProps().open).toBe(true)
    })
    // The open created a history entry (push), not a replace.
    expect(routerPushSpy).toHaveBeenCalled()

    // Simulate the browser Back button (URL loses ?edit) → the dialog closes.
    navigate('')
    await waitFor(() => {
      expect(editProps().open).toBe(false)
    })
  })

  it('closing via X uses replace (no new history entry)', async () => {
    currentSearch = 'view=42'
    renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
      })
    )
    await waitFor(() => {
      expect(viewProps().open).toBe(true)
    })

    act(() => viewProps().onOpenChange(false))
    await waitFor(() => {
      expect(viewProps().open).toBe(false)
    })
    // Close cleans up the param via replace, never push.
    await waitFor(() => {
      const lastReplace = routerReplaceSpy.mock.calls
        .map(([url]) => String(url))
        .at(-1)
      expect(lastReplace).toBeDefined()
      expect(lastReplace).not.toContain('view=42')
    })
    expect(routerPushSpy).not.toHaveBeenCalled()
  })

  it('closes the dialog state first and clears the URL only after the exit animation', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      currentSearch = 'view=42'
      renderFull(
        makeFullConfig({
          view: {
            title: 'Detalhes',
            urlParam: 'view',
            renderContent: () => null,
          },
        })
      )
      await waitFor(() => expect(viewProps().open).toBe(true))
      routerReplaceSpy.mockClear()

      act(() => viewProps().onOpenChange(false))
      // State closes synchronously (Radix runs its exit animation)...
      expect(viewProps().open).toBe(false)
      // ...but the navigation that clears ?view waits for the animation to end,
      // so it can't re-render/unmount the dialog mid-exit (body stuck with pointer-events:none).
      act(() => {
        vi.advanceTimersByTime(DIALOG_CLOSE_URL_DELAY_MS - 50)
      })
      expect(routerReplaceSpy).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(routerReplaceSpy).toHaveBeenCalledWith('/admin/users', {
        scroll: false,
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('deep-link on mount neither pushes nor replaces (URL is already the entry)', async () => {
    currentSearch = 'view=42'
    renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
      })
    )
    await waitFor(() => {
      expect(viewProps().open).toBe(true)
    })
    expect(routerPushSpy).not.toHaveBeenCalled()
    expect(routerReplaceSpy).not.toHaveBeenCalled()
  })

  // Regression: when only `view` has a urlParam (the /admin/cadastro modules),
  // the view→edit handoff flips the state to `edit` and the state→URL branch
  // strips `?view`. That strip must NOT be read back as "close the edit".
  it('view → edit handoff keeps edit open when edit has no urlParam', async () => {
    currentSearch = 'view=42'
    const { navigate } = renderFull(
      makeFullConfig({
        view: {
          title: 'Detalhes',
          urlParam: 'view',
          renderContent: () => null,
        },
        edit: { title: 'Editar' }, // no urlParam (mirrors cadastro configs)
      })
    )
    await waitFor(() => {
      expect(viewProps().open).toBe(true)
    })

    // The ViewDialog Edit button closes the view THEN calls onEdit (close-then-
    // open). The handoff must survive that ordering and land on the edit dialog.
    act(() => {
      viewProps().onOpenChange(false)
      viewProps().onEdit()
    })
    await waitFor(() => {
      expect(editProps().open).toBe(true)
      expect(editProps().id).toBe('42')
    })

    // The handoff's state→URL write strips `?view` (edit has no param). Simulate
    // that searchParams update + re-render: the edit must stay open, not re-close.
    navigate('')
    await waitFor(() => {
      expect(editProps().open).toBe(true)
      expect(editProps().id).toBe('42')
    })
  })

  it('does not open a hidden (keep-alive) ListPage sharing the same ?view param', async () => {
    // Two ListPages co-mounted on the same route, both with urlParam:'view'
    // (mirrors the cadastro tab dashboard). One is hidden via display:none.
    currentSearch = 'view=42'
    const visible = makeFullConfig({
      view: { title: 'Produtos', urlParam: 'view', renderContent: () => null },
    })
    const hidden = makeFullConfig({
      view: { title: 'Clientes', urlParam: 'view', renderContent: () => null },
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <div>
          <ListPage<MockUser> config={visible} />
        </div>
        <div style={{ display: 'none' }}>
          <ListPage<MockUser> config={hidden} />
        </div>
      </QueryClientProvider>
    )

    const callsFor = (title: string) =>
      viewDialogSpy.mock.calls
        .map(c => c[0])
        .filter((p: Record<string, unknown>) => p.title === title)
    const lastFor = (title: string) => callsFor(title).at(-1)

    // Visible ListPage opens for the deep-link...
    await waitFor(() => {
      expect(lastFor('Produtos')?.open).toBe(true)
      expect(lastFor('Produtos')?.id).toBe('42')
    })
    // ...the hidden one must NOT open its own dialog for an id that isn't its own.
    expect(lastFor('Clientes')?.open ?? false).toBe(false)
  })
})
