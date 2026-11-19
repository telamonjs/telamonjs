import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTabUrlSync } from './useTabUrlSync'

// Controllable next/navigation mock (search params + router spies)
const routerPushSpy = vi.fn()
const routerReplaceSpy = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushSpy,
    replace: routerReplaceSpy,
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin/cadastro',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

const TABS = ['clientes', 'produtos', 'fornecedores'] as const

describe('useTabUrlSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearch = ''
  })

  it('reads the active tab from the URL when valid', () => {
    currentSearch = 'tab=produtos'
    const { result } = renderHook(() => useTabUrlSync({ tabs: TABS }))
    expect(result.current.activeTab).toBe('produtos')
  })

  it('falls back to the first tab when the URL has no tab', () => {
    const { result } = renderHook(() => useTabUrlSync({ tabs: TABS }))
    expect(result.current.activeTab).toBe('clientes')
  })

  it('falls back when the URL tab is not in the valid list (stale/hidden)', () => {
    currentSearch = 'tab=naoexiste'
    const { result } = renderHook(() => useTabUrlSync({ tabs: TABS }))
    expect(result.current.activeTab).toBe('clientes')
  })

  it('honors an explicit defaultTab fallback', () => {
    const { result } = renderHook(() =>
      useTabUrlSync({ tabs: TABS, defaultTab: 'fornecedores' })
    )
    expect(result.current.activeTab).toBe('fornecedores')
  })

  it('setTab pushes a history entry by default (Back returns to previous tab)', () => {
    currentSearch = 'tab=clientes'
    const { result } = renderHook(() => useTabUrlSync({ tabs: TABS }))
    act(() => result.current.setTab('produtos'))
    expect(routerPushSpy).toHaveBeenCalledWith('/admin/cadastro?tab=produtos', {
      scroll: false,
    })
    expect(routerReplaceSpy).not.toHaveBeenCalled()
  })

  it('setTab with history:replace does not create a history entry', () => {
    const { result } = renderHook(() =>
      useTabUrlSync({ tabs: TABS, history: 'replace' })
    )
    act(() => result.current.setTab('produtos'))
    expect(routerReplaceSpy).toHaveBeenCalledWith(
      '/admin/cadastro?tab=produtos',
      { scroll: false }
    )
    expect(routerPushSpy).not.toHaveBeenCalled()
  })

  it('setTab preserves other query params (merge)', () => {
    currentSearch = 'view=42&page=2'
    const { result } = renderHook(() => useTabUrlSync({ tabs: TABS }))
    act(() => result.current.setTab('produtos'))
    const url = String(routerPushSpy.mock.calls.at(-1)![0])
    expect(url).toContain('tab=produtos')
    expect(url).toContain('view=42')
    expect(url).toContain('page=2')
  })

  it('allowNone: resolves to null (grid stage) when the URL has no tab, instead of falling back to tabs[0]', () => {
    const { result } = renderHook(() =>
      useTabUrlSync({ tabs: TABS, allowNone: true })
    )
    expect(result.current.activeTab).toBeNull()
  })

  it('allowNone: still resolves a valid URL tab normally', () => {
    currentSearch = 'tab=fornecedores'
    const { result } = renderHook(() =>
      useTabUrlSync({ tabs: TABS, allowNone: true })
    )
    expect(result.current.activeTab).toBe('fornecedores')
  })

  it('allowNone: a stale/hidden URL tab also resolves to null (not tabs[0])', () => {
    currentSearch = 'tab=naoexiste'
    const { result } = renderHook(() =>
      useTabUrlSync({ tabs: TABS, allowNone: true })
    )
    expect(result.current.activeTab).toBeNull()
  })

  it('allowNone: setTab(null) clears the param (back to the grid stage)', () => {
    currentSearch = 'tab=produtos'
    const { result } = renderHook(() =>
      useTabUrlSync({ tabs: TABS, allowNone: true })
    )
    act(() => result.current.setTab(null))
    expect(routerPushSpy).toHaveBeenCalledWith('/admin/cadastro', {
      scroll: false,
    })
  })

  it('supports a custom param key', () => {
    currentSearch = 'aba=produtos'
    const { result } = renderHook(() =>
      useTabUrlSync({ tabs: TABS, paramKey: 'aba' })
    )
    expect(result.current.activeTab).toBe('produtos')
    act(() => result.current.setTab('fornecedores'))
    expect(routerPushSpy).toHaveBeenCalledWith(
      '/admin/cadastro?aba=fornecedores',
      { scroll: false }
    )
  })

  // PRD 068 item 8: re-selecting the tab already in the URL is a no-op
  describe('idempotent setTab', () => {
    it('re-selecting the tab already in the URL does not navigate', () => {
      currentSearch = 'tab=produtos'
      const { result } = renderHook(() => useTabUrlSync({ tabs: TABS }))
      act(() => result.current.setTab('produtos'))
      expect(routerPushSpy).not.toHaveBeenCalled()
      expect(routerReplaceSpy).not.toHaveBeenCalled()
    })

    it('keeps ?edit=/?view= untouched when re-selecting the current tab', () => {
      currentSearch = 'tab=produtos&edit=42'
      const { result } = renderHook(() =>
        useTabUrlSync({ tabs: TABS, history: 'replace' })
      )
      act(() => result.current.setTab('produtos'))
      expect(routerReplaceSpy).not.toHaveBeenCalled()
      expect(routerPushSpy).not.toHaveBeenCalled()
    })

    it('an implicit default tab (no ?tab in the URL) is still written', () => {
      const { result } = renderHook(() => useTabUrlSync({ tabs: TABS }))
      expect(result.current.activeTab).toBe('clientes')
      act(() => result.current.setTab('clientes'))
      expect(routerPushSpy).toHaveBeenCalledWith('/admin/cadastro?tab=clientes', {
        scroll: false,
      })
    })
  })
})
