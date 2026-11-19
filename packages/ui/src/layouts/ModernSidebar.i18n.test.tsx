import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { ModernSidebar } from './ModernSidebar'
import { msg } from '../i18n/msg'
import { telamonjsMessages } from '../i18n/messages'
import type { MenuItem } from '../types/menu'

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

describe('ModernSidebar i18n', () => {
  it('renders literal menu item titles under a non-default locale provider (useText passthrough)', () => {
    const menuFixture: MenuItem[] = [
      { id: 'home', type: 'single', title: 'Dashboard', href: '/admin', icon: 'Home' },
    ]
    render(
      <NextIntlClientProvider locale='en' messages={telamonjsMessages.en}>
        <ModernSidebar menuConfig={menuFixture} />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('resolves a MessageRef title (msg("nav.users")) against app messages in the active locale', () => {
    const appMessages = { nav: { users: 'Users' } }
    const menuFixture: MenuItem[] = [
      { id: 'users', type: 'single', title: msg('nav.users'), href: '/admin/users', icon: 'Users' },
    ]
    render(
      <NextIntlClientProvider locale='en' messages={{ ...telamonjsMessages.en, ...appMessages }}>
        <ModernSidebar menuConfig={menuFixture} />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('exposes the sidebar as a named complementary landmark', () => {
    render(
      <NextIntlClientProvider locale='en' messages={telamonjsMessages.en}>
        <ModernSidebar menuConfig={[]} />
      </NextIntlClientProvider>,
    )
    expect(screen.getByRole('complementary', { name: 'Sidebar navigation' })).toBeInTheDocument()
  })
})
