import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSyncExternalStore, type ReactNode } from 'react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import { useUrlFilters, type UrlFilterDef } from './use-url-filters'

expect.extend(axeMatchers)

// The panel needs the real popover/button/input: the global mocks never open or focus.
vi.unmock('../ui/popover')
vi.unmock('../ui/button')
vi.unmock('../ui/input')

// ── next/navigation: router.replace moves the URL, as a Next navigation does ──
let search = new URLSearchParams()
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const setUrl = (query: string) => {
  search = new URLSearchParams(query)
  listeners.forEach(fn => fn())
}
const replace = vi.fn((url: string) => setUrl(url.split('?')[1] ?? ''))
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  usePathname: () => '/admin/x',
  useSearchParams: () => useSyncExternalStore(subscribe, () => search),
}))

const url = () => Object.fromEntries(search.entries())
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const STATUS: UrlFilterDef = {
  kind: 'options',
  param: 'aStatus',
  apiKey: 'status',
  label: 'Status',
  options: [
    { value: 'X', label: 'Xis' },
    { value: 'Y', label: 'Ipsilon' },
  ],
}
const QUOTA: UrlFilterDef = {
  kind: 'options',
  param: 'aQuota',
  apiKey: 'quota',
  label: 'Cota',
  options: [{ value: 'PCD', label: 'PcD' }],
}
const PENDING: UrlFilterDef = {
  kind: 'options',
  param: 'bStatus',
  apiKey: 'status',
  label: 'Status',
  defaultValue: 'PENDENTE',
  noDefaultValue: 'TODOS',
  options: [
    { value: 'TODOS', label: 'Todos' },
    { value: 'PENDENTE', label: 'Pendente' },
  ],
}
const STATES = [
  { value: 'RN', label: 'Rio Grande do Norte', description: 'RN' },
  { value: 'PB', label: 'Paraíba', description: 'PB' },
]
const loadStates = vi.fn(async (_search: string, _ctx: { selected: string[] }) => STATES)
const STATE: UrlFilterDef = { kind: 'options', param: 'uf', label: 'UF', load: loadStates, queryKey: ['states'] }
const loadCities = vi.fn(async (_search: string, { parent }: { parent: string | null }) =>
  parent === 'RN' ? [{ value: 'mos', label: 'Mossoró' }] : []
)
const CITY: UrlFilterDef = {
  kind: 'options',
  param: 'city',
  apiKey: 'cityId',
  label: 'Município',
  load: loadCities,
  queryKey: ['cities'],
  dependsOn: 'uf',
  requireParent: true,
  parentPlaceholder: 'Selecione a UF',
}
const PERIOD: UrlFilterDef = { kind: 'dateRange', param: 'period', label: 'Período' }
const NUMBER: UrlFilterDef = { kind: 'text', param: 'num', apiKey: 'number', label: 'Número', placeholder: 'Nº' }

beforeEach(() => {
  setUrl('')
  replace.mockClear()
})

const hook = (defs: readonly UrlFilterDef[], opts?: Parameters<typeof useUrlFilters>[1]) =>
  renderHook(() => useUrlFilters(defs, opts), { wrapper })

describe('useUrlFilters (state)', () => {
  it('the default applies and shows as a chip (an invisible filter would look like the whole list)', () => {
    const { result } = hook([PENDING])
    expect(result.current.values).toEqual({ status: 'PENDENTE' })
    expect(result.current.activeFilters.map(c => c.label)).toEqual(['Status: Pendente'])

    act(() => setUrl('bStatus=TODOS'))
    expect(result.current.values).toEqual({ status: 'TODOS' })
    expect(result.current.activeFilters.map(c => c.label)).toEqual(['Status: Todos'])
  })

  it("removing the default's chip writes noDefaultValue, so the filter really leaves", () => {
    const { result } = hook([PENDING])
    act(() => result.current.activeFilters[0].onRemove())
    expect(replace).toHaveBeenCalledWith('/admin/x?bStatus=TODOS', { scroll: false })
  })

  it('removing the chip of another value goes back to the default (param removed, replace)', () => {
    setUrl('bStatus=TODOS')
    const { result } = hook([PENDING])
    act(() => result.current.activeFilters[0].onRemove())
    expect(replace).toHaveBeenCalledWith('/admin/x', { scroll: false })
  })

  it('clear removes every param in a single write, keeping unrelated ones', () => {
    setUrl('aStatus=X&aQuota=PCD&tab=other')
    const { result } = hook([STATUS, QUOTA])
    expect(result.current.activeFilters).toHaveLength(2)
    act(() => result.current.onClearFilters())
    expect(replace).toHaveBeenCalledTimes(1)
    expect(url()).toEqual({ tab: 'other' })
  })

  it('a local value outside the options is ignored (old or hand-edited URL)', () => {
    setUrl('aStatus=HACK&aQuota=PCD')
    const { result } = hook([STATUS, QUOTA])
    expect(result.current.values).toEqual({ quota: 'PCD' })
    expect(result.current.activeFilters).toHaveLength(1)
  })

  it('unique params: list A does not see the param of list B', () => {
    setUrl('bStatus=TODOS')
    expect(hook([STATUS, QUOTA]).result.current.values).toEqual({})
  })

  it('values keeps its identity while nothing changes', () => {
    setUrl('aStatus=X')
    const { result, rerender } = hook([STATUS, QUOTA])
    const before = result.current.values
    rerender()
    expect(result.current.values).toBe(before)
    act(() => setUrl('aStatus=Y'))
    expect(result.current.values).not.toBe(before)
  })

  it('params lists every URL key; omit drops filters by apiKey', () => {
    expect(hook([STATUS, PERIOD, NUMBER]).result.current.params).toEqual(['aStatus', 'periodFrom', 'periodTo', 'num'])
    setUrl('num=12')
    const { result } = hook([STATUS, NUMBER], { omit: ['number'] })
    expect(result.current.params).toEqual(['aStatus'])
    expect(result.current.values).toEqual({})
  })

  it('a remote value gets its label from load("", { selected }), and chipLabel can shorten it', async () => {
    setUrl('uf=RN')
    const { result } = hook([STATE])
    expect(result.current.values).toEqual({ uf: 'RN' })
    expect(result.current.activeFilters[0].label).toBe('UF: …')
    await waitFor(() => expect(result.current.activeFilters[0].label).toBe('UF: Rio Grande do Norte'))
    expect(loadStates).toHaveBeenCalledWith('', expect.objectContaining({ parent: null, selected: ['RN'] }))

    const short: UrlFilterDef = { ...STATE, chipLabel: i => String(i.description) }
    const shortHook = hook([short])
    await waitFor(() => expect(shortHook.result.current.activeFilters[0].label).toBe('UF: RN'))
  })

  it('a remote value load does not return falls back to the raw value', async () => {
    setUrl('uf=ZZ')
    const { result } = hook([STATE])
    await waitFor(() => expect(result.current.activeFilters[0].label).toBe('UF: ZZ'))
  })

  it('the parent comes from the URL, else from fixed', async () => {
    setUrl('city=mos')
    hook([STATE, CITY], { fixed: { uf: 'RN' } })
    await waitFor(() =>
      expect(loadCities).toHaveBeenCalledWith('', expect.objectContaining({ parent: 'RN', selected: ['mos'] }))
    )
  })

  it('date range chips use the locale and since/until', () => {
    setUrl('periodFrom=2026-02-01&periodTo=2026-02-10')
    expect(hook([PERIOD]).result.current.activeFilters[0].label).toBe('Período: 01/02/2026 – 10/02/2026')
    setUrl('periodFrom=2026-02-01')
    expect(hook([PERIOD]).result.current.activeFilters[0].label).toBe('Período: desde 01/02/2026')
    setUrl('periodTo=2026-02-10')
    const { result } = hook([PERIOD])
    expect(result.current.activeFilters[0].label).toBe('Período: até 10/02/2026')
    expect(result.current.values).toEqual({ periodTo: '2026-02-10' })
  })

  it('removing a parent chip clears its dependents in the same write', () => {
    setUrl('uf=RN&city=mos')
    const { result } = hook([STATE, CITY])
    act(() => result.current.activeFilters[0].onRemove())
    expect(replace).toHaveBeenCalledTimes(1)
    expect(url()).toEqual({})
  })
})

function Panel({ defs }: { defs: readonly UrlFilterDef[] }) {
  return <>{useUrlFilters(defs).filtersPanel}</>
}
const renderPanel = (defs: readonly UrlFilterDef[]) => render(<Panel defs={defs} />, { wrapper })

describe('useUrlFilters (panel)', () => {
  it('lays out a one-column grid that never grows past the popover', () => {
    renderPanel([STATUS, NUMBER])
    const grid = screen.getByTestId('url-filter-aStatus').parentElement!
    expect(grid.className).toContain('grid-cols-[minmax(0,1fr)]')
    expect(grid.className).toContain('min-w-0')
    expect(screen.getByTestId('url-filter-aStatus').className).toContain('min-w-0')
  })

  it('picking an option writes the URL with replace', async () => {
    const user = userEvent.setup()
    renderPanel([STATUS])
    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(await screen.findByRole('option', { name: /Ipsilon/ }))
    expect(url()).toEqual({ aStatus: 'Y' })
    expect(push).not.toHaveBeenCalled()
  })

  it('a dependent selector is disabled without its parent, and changing the parent clears it', async () => {
    const user = userEvent.setup()
    renderPanel([STATE, CITY])
    const city = screen.getByRole('combobox', { name: 'Município' })
    expect(city).toBeDisabled()
    expect(city).toHaveTextContent('Selecione a UF')

    act(() => setUrl('uf=RN&city=mos'))
    expect(screen.getByRole('combobox', { name: 'Município' })).toBeEnabled()
    await user.click(screen.getByRole('combobox', { name: 'UF' }))
    await user.click(await screen.findByRole('option', { name: /Paraíba/ }))
    expect(url()).toEqual({ uf: 'PB' })
  })

  it('text commits on Enter and on blur, not on every key', async () => {
    const user = userEvent.setup()
    renderPanel([NUMBER])
    const input = screen.getByLabelText('Número')
    await user.type(input, '12')
    expect(replace).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(url()).toEqual({ num: '12' })

    await user.clear(input)
    await user.type(input, '7')
    await user.tab()
    expect(url()).toEqual({ num: '7' })
  })

  it('a date range without dates shows "Qualquer data"', () => {
    renderPanel([PERIOD])
    expect(screen.getByTestId('date-range-picker-trigger')).toHaveTextContent('Qualquer data')
  })

  it('has no axe violations', async () => {
    setUrl('aStatus=X')
    const { container } = renderPanel([STATUS, STATE, CITY, PERIOD, NUMBER])
    expect(await axe(container)).toHaveNoViolations()
  })
})
