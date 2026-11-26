import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { ViewsMenu } from './ViewsMenu'
import { encodeViewConfig, type SavedView } from './viewsManager'

const { toastError, toastSuccess } = vi.hoisted(() => ({ toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: toastError, success: toastSuccess } }))

const config: SavedView['config'] = {
  columnVisibility: { email: false },
  columnOrder: ['name', 'email'],
  columnSizing: {},
  sorting: [{ field: 'name', order: 'desc' }],
  filters: { search: 'São' },
}
const currentConfig = { columnVisibility: {}, columnOrder: [], columnSizing: {}, sorting: [], filters: {} }

const openAt = (search: string) => window.history.replaceState({}, '', `/admin/users${search}`)

afterEach(() => {
  openAt('')
  vi.clearAllMocks()
})

describe('ViewsMenu shared links', () => {
  it('applies a ?sharedView= link on mount and removes the param, keeping the others', async () => {
    openAt(`?page=2&sharedView=${encodeViewConfig(config)}`)
    const onLoadView = vi.fn()
    render(<ViewsMenu tableId='users-shared' currentConfig={currentConfig} onLoadView={onLoadView} />)
    await waitFor(() => expect(onLoadView).toHaveBeenCalledTimes(1))
    expect(onLoadView.mock.calls[0][0].config).toEqual(config)
    expect(window.location.search).toBe('?page=2')
  })

  it('shows an error for a broken link and loads nothing', async () => {
    openAt('?sharedView=%25%25broken')
    const onLoadView = vi.fn()
    render(<ViewsMenu tableId='users-shared' currentConfig={currentConfig} onLoadView={onLoadView} />)
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(onLoadView).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
  })

  it('does nothing without the param', () => {
    const onLoadView = vi.fn()
    render(<ViewsMenu tableId='users-shared' currentConfig={currentConfig} onLoadView={onLoadView} />)
    expect(onLoadView).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })
})
