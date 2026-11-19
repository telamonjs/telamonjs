import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ListPageTable } from './ListPageTable'
import type { ListConfig } from '../../types/crud'

const tableColumns = vi.hoisted(() => ({ ids: [] as string[] }))
vi.mock('../../data/DataTable', () => ({
  DataTable: ({ columns }: { columns: { id: string }[] }) => {
    tableColumns.ids = columns.map(c => c.id)
    return <table />
  },
}))
vi.mock('../../data/InfiniteList', () => ({
  InfiniteList: () => <div />,
}))

describe('ListPageTable embedded scroll container', () => {
  it('is a focusable named region', () => {
    render(
      <ListPageTable
        list={{ columns: [] } as unknown as ListConfig<unknown>}
        data={[]}
        total={0}
        loading={false}
        error={undefined}
        tableId='t'
        page={1}
        pageSize={10}
        isServerSidePagination={false}
        filterOptions={{}}
        enableBulkActions={false}
        bulkActions={[]}
        headerActions={[]}
        embedded
        isInfiniteScroll={false}
        infiniteQuery={{} as never}
        hasCreateDialog={false}
        onRowClick={undefined}
        actionsConfig={undefined}
        onRefresh={async () => {}}
        onExport={() => {}}
        onAdd={() => {}}
      />
    )
    const region = screen.getByRole('region', { name: 'Lista de registros' })
    expect(region).toHaveAttribute('tabindex', '0')
  })

  it('leaves meta.exportOnly columns out of the table', () => {
    render(
      <ListPageTable
        list={
          {
            columns: [
              { id: 'nome', header: 'Nome' },
              { id: 'cnpj', header: 'CNPJ', meta: { exportOnly: true } },
            ],
          } as unknown as ListConfig<unknown>
        }
        data={[]}
        total={0}
        loading={false}
        error={undefined}
        tableId='t'
        page={1}
        pageSize={10}
        isServerSidePagination={false}
        filterOptions={{}}
        enableBulkActions={false}
        bulkActions={[]}
        headerActions={[]}
        isInfiniteScroll={false}
        infiniteQuery={{} as never}
        hasCreateDialog={false}
        onRowClick={undefined}
        actionsConfig={undefined}
        onRefresh={async () => {}}
        onExport={() => {}}
        onAdd={() => {}}
      />
    )
    expect(tableColumns.ids).toEqual(['nome'])
  })
})
