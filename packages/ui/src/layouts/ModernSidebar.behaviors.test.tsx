/**
 * Characterization tests for ModernSidebar.
 *
 * WHY THIS EXISTS: `ModernSidebar.test.tsx` only pins the impersonation
 * dropdown flow (loading/error/success states). Everything else in this
 * 900+ line component — menu item/section rendering, active-item detection,
 * compact mode, the mobile drawer, hidden state, logo sizing — had zero
 * coverage, which blocks plan 012 (decompose god modules: extract
 * `MenuItemComponent`, `MenuSectionComponent`, and the mobile drawer into
 * their own files). This file pins the CURRENT behavior — including
 * anything that looks like a quirk — so that extraction is safe to do
 * behind an unchanged, green suite. Do not "fix" surprising behavior found
 * here; report it separately and pin what exists.
 *
 * Real `sidebar-store` / `menu-store` (Zustand) are used directly instead of
 * mocked, so navigation-stack push/pop and sidebar-state toggling exercise
 * the real store logic, not a stand-in. `next/navigation` is mocked with a
 * controllable pathname (mutable `mockPathname`) since ModernSidebar reads
 * it outside of any store. `DropdownMenu` ends up using the REAL Radix
 * primitive here (not the simplified `ui-mocks.tsx` stand-in) because the
 * vitest.config.ts alias for `'../ui/dropdown-menu'` is a literal-string
 * match against ui-mocks.tsx's own `vi.mock` specifier, not against
 * ModernSidebar's own `'../../ui/dropdown-menu'` import — see
 * ModernSidebar.test.tsx for prior art relying on the same quirk.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { axe, configureAxe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import { ModernSidebar } from './ModernSidebar'
import { useSidebarStore } from '../stores/sidebar-store'
import { useMenuStore } from '../stores/menu-store'
import type { MenuItem } from '../types/menu'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Axe must see real markup, not the ui-mocks.tsx div/span stand-ins.
vi.unmock('../ui/button')
vi.unmock('../ui/badge')

let mockPathname = '/admin'
const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

const menuFixture: MenuItem[] = [
  { id: 'home', type: 'single', title: 'Início', href: '/admin', icon: 'Home' },
  { id: 'sep-1', type: 'separator' },
  {
    id: 'users-group',
    type: 'group',
    title: 'Usuários',
    icon: 'Users',
    children: [
      {
        id: 'users-list',
        type: 'single',
        title: 'Listar',
        href: '/admin/users',
      },
      {
        id: 'users-new',
        type: 'single',
        title: 'Novo Usuário',
        href: '/admin/users/new',
        isNew: true,
      },
    ],
  },
  {
    id: 'reports',
    type: 'single',
    title: 'Relatórios',
    href: '/admin/reports',
    icon: 'FileText',
    badge: '3',
    isBeta: true,
    isFavorite: true,
  },
  {
    id: 'blocked',
    type: 'single',
    title: 'Bloqueado',
    href: '/admin/blocked',
    isDisabled: true,
    icon: 'Lock',
  },
]

const session = {
  user: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: { name: 'Admin' },
  },
}

function resetStores() {
  useSidebarStore.setState({ sidebarState: 'expanded', isMobileOpen: false })
  useMenuStore.setState({
    menuStack: [],
    currentSection: null,
    lastInteraction: null,
    isNavigating: false,
  })
}

describe('ModernSidebar - menu rendering, states & mobile drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = '/admin'
    resetStores()
  })

  describe('Rendering', () => {
    it('renders single, group and separator items from menuConfig', () => {
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)

      expect(screen.getByText('Início')).toBeInTheDocument()
      expect(screen.getByText('Usuários')).toBeInTheDocument()
      expect(screen.getByText('Relatórios')).toBeInTheDocument()
      expect(screen.getByText('Bloqueado')).toBeInTheDocument()
      // Group children are not flattened into the top-level list.
      expect(screen.queryByText('Listar')).not.toBeInTheDocument()
    })

    it('resolves string icons via getIcon', () => {
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
      expect(screen.getByTestId('icon-users')).toBeInTheDocument()
    })

    it('renders badge/new/beta indicators for a single item', () => {
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      const reportsButton = screen.getByText('Relatórios').closest('button')!
      expect(within(reportsButton).getByText('3')).toBeInTheDocument()
      expect(within(reportsButton).getByText('Beta')).toBeInTheDocument()
    })

    it('renders a disabled item as an inert element with aria-disabled', () => {
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      const blocked = screen
        .getByText('Bloqueado')
        .closest('div[aria-disabled]')
      expect(blocked).toHaveAttribute('aria-disabled', 'true')
      // Disabled items render as a <div>, not an interactive <button>.
      expect(
        screen.queryByRole('button', { name: /Bloqueado/i })
      ).not.toBeInTheDocument()
    })

    it('renders nothing at all when sidebarState is hidden', () => {
      useSidebarStore.setState({ sidebarState: 'hidden' })
      const { container } = render(
        <ModernSidebar menuConfig={menuFixture} session={session} />
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('hides item titles but keeps icons in compact mode', () => {
      useSidebarStore.setState({ sidebarState: 'compact' })
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      expect(screen.queryByText('Início')).not.toBeInTheDocument()
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    })

    it('renders no user footer/dropdown when session is absent', () => {
      render(<ModernSidebar menuConfig={menuFixture} />)
      expect(screen.queryByTestId('dropdown-trigger')).not.toBeInTheDocument()
    })

    it('renders footerContent in the desktop footer when not compact', () => {
      render(
        <ModernSidebar
          menuConfig={menuFixture}
          session={session}
          footerContent={<div>Custom Footer</div>}
        />
      )
      expect(screen.getByText('Custom Footer')).toBeInTheDocument()
    })

    it('does not render footerContent in the desktop column when compact', () => {
      useSidebarStore.setState({ sidebarState: 'compact' })
      render(
        <ModernSidebar
          menuConfig={menuFixture}
          session={session}
          footerContent={<div>Custom Footer</div>}
        />
      )
      expect(screen.queryByText('Custom Footer')).not.toBeInTheDocument()
    })

    it('applies a custom logoHeight to the logo image', () => {
      render(
        <ModernSidebar
          menuConfig={menuFixture}
          session={session}
          logoHeight={64}
        />
      )
      const logo = screen.getByAltText('Sistema')
      expect(logo).toHaveStyle({ height: '64px' })
    })
  })

  describe('Interactions', () => {
    it('navigates via router.push when a single item is clicked', async () => {
      const user = userEvent.setup()
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      await user.click(screen.getByText('Início'))
      expect(mockRouterPush).toHaveBeenCalledWith('/admin')
    })

    it('drills into a group and shows a back button with the group title', async () => {
      const user = userEvent.setup()
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)

      await user.click(screen.getByText('Usuários'))

      expect(screen.getByText('Listar')).toBeInTheDocument()
      expect(screen.getByText('Novo Usuário')).toBeInTheDocument()
      // Top-level items are replaced, not appended.
      expect(screen.queryByText('Início')).not.toBeInTheDocument()
      expect(useMenuStore.getState().menuStack).toHaveLength(1)
    })

    it('goes back to the top-level menu when the back button is clicked', async () => {
      const user = userEvent.setup()
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)

      await user.click(screen.getByText('Usuários'))
      expect(screen.getByText('Listar')).toBeInTheDocument()

      // The back button's accessible text is the CURRENT (child) menu title.
      await user.click(screen.getByText('Usuários'))
      expect(screen.getByText('Início')).toBeInTheDocument()
      expect(useMenuStore.getState().menuStack).toHaveLength(0)
    })

    it('toggles sidebarState between expanded and compact via the collapse button', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <ModernSidebar menuConfig={menuFixture} session={session} />
      )
      const collapseButton = container.querySelector(
        'button svg[data-icon="ChevronLeft"]'
      )!.parentElement as HTMLElement

      await user.click(collapseButton)
      expect(useSidebarStore.getState().sidebarState).toBe('compact')

      await user.click(collapseButton)
      expect(useSidebarStore.getState().sidebarState).toBe('expanded')
    })

    it('opens the mobile drawer when the mobile trigger is clicked', async () => {
      const user = userEvent.setup()
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)

      const triggers = screen.getAllByRole('button')
      const mobileTrigger = triggers.find(btn =>
        btn.querySelector('svg[data-icon="Menu"]')
      )!
      await user.click(mobileTrigger)

      expect(useSidebarStore.getState().isMobileOpen).toBe(true)
    })

    it('closes the mobile drawer via the X button', async () => {
      useSidebarStore.setState({ isMobileOpen: true })
      const user = userEvent.setup()
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)

      const closeButton = screen
        .getByTestId('icon-x')
        .closest('button') as HTMLElement
      await user.click(closeButton)

      expect(useSidebarStore.getState().isMobileOpen).toBe(false)
    })

    it('closes the mobile drawer and navigates when a mobile item is clicked', async () => {
      useSidebarStore.setState({ isMobileOpen: true })
      const user = userEvent.setup()
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)

      // Both desktop (hidden md:block) and mobile drawer render the item in
      // jsdom (no real CSS media query), so scope to the mobile drawer copy.
      const allInicio = screen.getAllByText('Início')
      await user.click(allInicio[allInicio.length - 1])

      expect(mockRouterPush).toHaveBeenCalledWith('/admin')
      expect(useSidebarStore.getState().isMobileOpen).toBe(false)
    })

    it('calls onSignOut when "Sair" is clicked in the desktop user menu', async () => {
      const user = userEvent.setup()
      const onSignOut = vi.fn()
      render(
        <ModernSidebar
          menuConfig={menuFixture}
          session={session}
          onSignOut={onSignOut}
        />
      )

      await user.click(screen.getByText('Jane Doe'))
      await user.click(screen.getByText('Sair'))

      expect(onSignOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('State Management', () => {
    it('marks the home item active only on an exact /admin match', () => {
      mockPathname = '/admin/reports'
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      const homeButton = screen.getByText('Início').closest('button')
      expect(homeButton).not.toHaveClass('border-primary')
    })

    it('marks a non-home item active on exact pathname match', () => {
      mockPathname = '/admin/reports'
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      const reportsButton = screen.getByText('Relatórios').closest('button')
      expect(reportsButton).toHaveClass('border-primary')
    })

    it('picks the longest-prefix href match as active among overlapping routes', () => {
      const overlapping: MenuItem[] = [
        { id: 'a', type: 'single', title: 'Users', href: '/admin/users' },
        {
          id: 'b',
          type: 'single',
          title: 'Users Edit',
          href: '/admin/users/edit',
        },
      ]
      mockPathname = '/admin/users/edit/5'
      render(<ModernSidebar menuConfig={overlapping} session={session} />)

      expect(screen.getByText('Users Edit').closest('button')).toHaveClass(
        'border-primary'
      )
      expect(screen.getByText('Users').closest('button')).not.toHaveClass(
        'border-primary'
      )
    })

    it('marks a group active when the pathname matches a child href', () => {
      mockPathname = '/admin/users'
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      expect(screen.getByText('Usuários').closest('button')).toHaveClass(
        'border-primary'
      )
    })
  })

  describe('Edge Cases', () => {
    it('renders without crashing when menuConfig is empty', () => {
      render(<ModernSidebar menuConfig={[]} session={session} />)
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('applies the bottom-right trigger position classes', () => {
      const { container } = render(
        <ModernSidebar
          menuConfig={menuFixture}
          session={session}
          mobileTriggerPosition='bottom-right'
        />
      )
      const trigger = container.querySelector('.md\\:hidden.bottom-4')
      expect(trigger).toBeInTheDocument()
    })

    it('renders an item with no icon without crashing', () => {
      const noIcon: MenuItem[] = [
        { id: 'x', type: 'single', title: 'No Icon', href: '/admin/no-icon' },
      ]
      render(<ModernSidebar menuConfig={noIcon} session={session} />)
      expect(screen.getByText('No Icon')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations', async () => {
      // The mobile trigger (Menu icon) and the desktop collapse toggle
      // (ChevronLeft/ChevronRight icon) are icon-only buttons and carry
      // aria-labels — this used to pin a button-name violation before the
      // labels were added.
      const { container } = render(
        <ModernSidebar menuConfig={menuFixture} session={session} />
      )
      const axeConfig = configureAxe({
        rules: {
          // jsdom cannot compute real contrast; covered visually elsewhere.
          'color-contrast': { enabled: false },
        },
      })
      const results = await axeConfig(container)
      const violationIds = results.violations.map(v => v.id).sort()
      expect(violationIds).toEqual([])
    })

    it('the back button is reachable by role and has readable text', async () => {
      const user = userEvent.setup()
      render(<ModernSidebar menuConfig={menuFixture} session={session} />)
      await user.click(screen.getByText('Usuários'))
      expect(
        screen.getByRole('button', { name: /Usuários/i })
      ).toBeInTheDocument()
    })
  })
})
