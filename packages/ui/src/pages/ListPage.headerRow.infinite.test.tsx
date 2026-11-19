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

// Infinite mode (the ListPage default) renders InfiniteList, not DataTable: capture its props
let listProps: Record<string, any> = {}
vi.mock('../data/InfiniteList', () => ({
  InfiniteList: (props: Record<string, unknown>) => {
    listProps = props
    return <div data-testid='infinite-list-mock' />
  },
}))

// Prop recorders: capture exactly what ListPage forwards to each dialog
const editDialogSpy = vi.fn()
vi.mock('../components/dialog/edit-dialog', () => ({
  EditDialog: (props: Record<string, unknown>) => {
    editDialogSpy(props)
    return null
  },
}))
vi.mock('../components/dialog/view-dialog', () => ({ ViewDialog: () => null }))
vi.mock('../components/dialog/create-dialog', () => ({ CreateDialog: () => null }))

interface Row {
  id: string
  name: string
  curso: string
}

const row: Row = { id: '1', name: 'Turma A', curso: 'ENEM' }

function makeConfig(): CrudConfig<Row, Partial<Row>> {
  return {
    module: { name: 'turmas', title: 'Turmas', route: '/admin/turmas' },
    // infiniteScroll omitted on purpose: true is the default
    list: { columns: [{ accessorKey: 'name', header: 'Name' }] },
    form: {
      validation: z.object({ name: z.string() }),
      sections: [{ title: 'Dados', fields: [{ name: 'name', label: 'Nome', type: 'text' }] }],
    },
    query: {
      queryKey: ['turmas-infinite'],
      queryFn: vi.fn().mockResolvedValue(createPaginatedResponse([row], 1, 1, 10)),
    },
    mutations: {
      create: { mutationFn: vi.fn(), invalidates: [['turmas-infinite']] },
      update: { mutationFn: vi.fn(), invalidates: [['turmas-infinite']] },
      delete: { mutationFn: vi.fn(), invalidates: [['turmas-infinite']] },
    },
    dialogs: { edit: { title: 'Editar turma' }, view: { title: 'Turma' } },
  }
}

describe('ListPage - headerRow in infinite scroll mode (7.20.1)', () => {
  beforeEach(() => {
    listProps = {}
    editDialogSpy.mockClear()
  })

  it('passes the clicked row as EditDialog.headerRow when the list uses infinite scroll', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <ListPage<Row> config={makeConfig()} />
      </QueryClientProvider>
    )
    // Wait until the infinite query delivered the row to the list
    await waitFor(() => expect(listProps.data?.length ?? listProps.items?.length ?? 0).toBeGreaterThan(0))
    await act(async () => {
      await listProps.actionsConfig.standard.edit.handler(row)
    })
    await waitFor(() => expect(editDialogSpy).toHaveBeenCalled())
    const props = editDialogSpy.mock.calls.at(-1)![0] as { headerRow?: Row }
    expect(props.headerRow).toEqual(row)
  })
})
