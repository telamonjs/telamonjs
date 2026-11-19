import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModernSidebar } from './ModernSidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))
vi.mock('../stores/sidebar-store', () => ({
  useSidebarStore: { persist: { rehydrate: vi.fn() } },
  useSidebarState: () => 'expanded',
  useIsMobileOpen: () => false,
  useSidebarActions: () => ({ toggleSidebar: vi.fn(), setMobileOpen: vi.fn() }),
}))
vi.mock('../stores/menu-store', () => ({
  useMenuStack: () => [],
  useMenuActions: () => ({ handleSectionClick: vi.fn(), handleBackClick: vi.fn() }),
}))

const session = { user: { name: 'Ana', email: 'ana@x.com' } }

describe('ModernSidebar user menu — Perfil (consumer QA 7.3.1)', () => {
  it('links "Perfil" to profileHref', () => {
    render(<ModernSidebar menuConfig={[]} session={session} profileHref='/admin/perfil' />)
    const links = screen.getAllByRole('link', { name: /perfil/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach(a => expect(a).toHaveAttribute('href', '/admin/perfil'))
  })

  it('without profileHref "Perfil" is not a link (kept disabled)', () => {
    render(<ModernSidebar menuConfig={[]} session={session} />)
    expect(screen.queryByRole('link', { name: /perfil/i })).not.toBeInTheDocument()
    expect(screen.getAllByText('Perfil').length).toBeGreaterThan(0)
  })
})
