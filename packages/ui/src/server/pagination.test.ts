import { describe, it, expect, vi } from 'vitest'
import { createPaginationContext } from './pagination'

function service(context: object = {}) {
  const { createPaginatedService } = createPaginationContext({
    prisma: {
      item: {
        findMany: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([
          { active: true, _count: { _all: 1 } },
          { active: false, _count: { _all: 1 } },
        ]),
        count: vi.fn(),
      },
    },
    auth: async () => null,
    ...context,
  })
  return createPaginatedService({ model: 'item', filters: { active: 'boolean' } })
}

describe('createPaginationContext (ui)', () => {
  it('labels boolean filter options in pt-BR by default', async () => {
    const options = await service().getFilterOptions!()
    expect(options.active.map(o => o.label)).toEqual(['Ativo', 'Inativo'])
  })

  it('follows the locale passed to getFilterOptions', async () => {
    const options = await service().getFilterOptions!('en')
    expect(options.active.map(o => o.label)).toEqual(['Active', 'Inactive'])
  })

  it('lets the app override the labels', async () => {
    const filterLabels = () => ({ yes: 'Y', no: 'N', active: 'On', inactive: 'Off' })
    const options = await service({ filterLabels }).getFilterOptions!()
    expect(options.active.map(o => o.label)).toEqual(['Off', 'On'])
  })
})
