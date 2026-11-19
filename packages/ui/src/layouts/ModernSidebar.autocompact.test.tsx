/**
 * ModernSidebar auto-compact below `lg` (1024px).
 *
 * Between md (768) and lg (1024) the desktop sidebar is visible but an
 * expanded 256px column leaves too little room for DataTable rows (row
 * actions only reachable via horizontal scroll). The sidebar renders compact
 * in that range WITHOUT touching the persisted store preference, so the
 * user's choice is restored as soon as the viewport is >= lg again.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModernSidebar } from './ModernSidebar'
import { useSidebarStore } from '../stores/sidebar-store'
import type { MenuItem } from '../types/menu'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))

const menu: MenuItem[] = [
  { id: 'home', type: 'single', title: 'Início', href: '/admin', icon: 'Home' },
]

type Listener = (e: { matches: boolean }) => void

/** matchMedia mock: `narrow` drives `(max-width: 1023px)`; returns a setter. */
function mockMatchMedia(narrow: boolean) {
  const listeners = new Map<string, Set<Listener>>()
  let isNarrow = narrow
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches = () => (query.includes('1023') ? isNarrow : false)
    return {
      get matches() {
        return matches()
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: Listener) => {
        if (!listeners.has(query)) listeners.set(query, new Set())
        listeners.get(query)!.add(cb)
      },
      removeEventListener: (_: string, cb: Listener) => {
        listeners.get(query)?.delete(cb)
      },
      dispatchEvent: vi.fn(),
    }
  })
  return (next: boolean) => {
    isNarrow = next
    listeners.forEach((set, query) => {
      if (query.includes('1023')) set.forEach(cb => cb({ matches: next }))
    })
  }
}

const desktopColumn = () =>
  screen.getByRole('button', { name: /menu lateral/i }).closest('.md\\:block')!

describe('ModernSidebar - auto-compact below lg', () => {
  beforeEach(() => {
    useSidebarStore.setState({ sidebarState: 'expanded', isMobileOpen: false })
  })

  it('renders compact between md and lg without changing the persisted preference', () => {
    mockMatchMedia(true)
    render(<ModernSidebar menuConfig={menu} />)

    expect(desktopColumn()).toHaveClass('w-16')
    expect(useSidebarStore.getState().sidebarState).toBe('expanded')
  })

  it('restores the persisted preference when the viewport grows back to lg', () => {
    const setNarrow = mockMatchMedia(true)
    render(<ModernSidebar menuConfig={menu} />)
    expect(desktopColumn()).toHaveClass('w-16')

    act(() => setNarrow(false))
    expect(desktopColumn()).toHaveClass('w-64')
  })

  it('lets the user expand manually while narrow, without persisting it', async () => {
    const user = userEvent.setup()
    mockMatchMedia(true)
    render(<ModernSidebar menuConfig={menu} />)

    await user.click(
      screen.getByRole('button', { name: 'Expandir menu lateral' })
    )
    expect(desktopColumn()).toHaveClass('w-64')
    expect(useSidebarStore.getState().sidebarState).toBe('expanded')
  })

  it('keeps the normal store toggle at lg and above', async () => {
    const user = userEvent.setup()
    mockMatchMedia(false)
    render(<ModernSidebar menuConfig={menu} />)

    await user.click(
      screen.getByRole('button', { name: 'Recolher menu lateral' })
    )
    expect(useSidebarStore.getState().sidebarState).toBe('compact')
    expect(desktopColumn()).toHaveClass('w-16')
  })

  it('pre-applies width via CSS below lg so the first paint has no 256 -> 64 jump', async () => {
    const user = userEvent.setup()
    mockMatchMedia(false)
    render(<ModernSidebar menuConfig={menu} />)
    expect(desktopColumn()).toHaveClass('w-64', 'max-lg:w-16')

    // user-expanded while narrow must win over the CSS fallback
    cleanup()
    mockMatchMedia(true)
    render(<ModernSidebar menuConfig={menu} />)
    await user.click(
      screen.getByRole('button', { name: 'Expandir menu lateral' })
    )
    expect(desktopColumn()).not.toHaveClass('max-lg:w-16')
  })
})
