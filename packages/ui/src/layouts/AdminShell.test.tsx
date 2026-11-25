/**
 * AdminShell.test.tsx
 *
 * Test suite for the AdminShell canonical shell component.
 * Structure: Rendering, Interactions, State Management, Edge Cases, Accessibility.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminShell } from './AdminShell'
import type { MenuItem } from '../types/menu'
import type { CommandPaletteItem } from '../navigation/CommandPalette'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const routerPushSpy = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushSpy,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin/dashboard',
  useSearchParams: () => new URLSearchParams(''),
}))

// ModernSidebar is a heavy component; mock its shell so tests focus on AdminShell logic
vi.mock('./ModernSidebar', () => ({
  ModernSidebar: ({
    menuConfig,
    systemName,
    compactLogoHeight,
    compactLogoMaxWidth,
    logoMaxWidth,
  }: {
    menuConfig?: MenuItem[]
    systemName?: string
    compactLogoHeight?: number | string
    compactLogoMaxWidth?: number | string
    logoMaxWidth?: number | string
  }) =>
    React.createElement(
      'nav',
      {
        'data-testid': 'modern-sidebar',
        'aria-label': systemName ?? 'sidebar',
        'data-compact-logo-height': compactLogoHeight,
        'data-compact-logo-max-width': compactLogoMaxWidth,
        'data-logo-max-width': logoMaxWidth,
      },
      [
        React.createElement(
          'ul',
          { key: 'menu' },
          (menuConfig ?? []).map(item =>
            item.type !== 'separator'
              ? React.createElement(
                  'li',
                  { key: item.id, 'data-testid': `menu-item-${item.id}` },
                  item.title
                )
              : null
          )
        ),
      ]
    ),
}))

// CommandPalette mock — captures items prop so we can inspect it
let capturedCommandItems: CommandPaletteItem[] = []
vi.mock('../navigation/CommandPalette', () => ({
  CommandPalette: ({ items }: { items: CommandPaletteItem[] }) => {
    capturedCommandItems = items
    return React.createElement(
      'div',
      { 'data-testid': 'command-palette' },
      items.map(i =>
        React.createElement(
          'span',
          { key: i.id, 'data-testid': `cp-item-${i.id}` },
          i.label
        )
      )
    )
  },
}))

// ResponsiveBreadcrumb mock — labels the current route ('/admin/dashboard')
// from the menu it receives, like the real breadcrumb does
vi.mock('../navigation/Breadcrumb', () => ({
  ResponsiveBreadcrumb: ({
    entityName,
    menuConfig,
  }: {
    entityName?: string
    menuConfig?: MenuItem[]
  }) => {
    const current = (menuConfig ?? [])
      .flatMap(item =>
        item.type === 'group' ? [item, ...item.children] : [item]
      )
      .find(
        item => item.type !== 'separator' && item.href === '/admin/dashboard'
      )
    return React.createElement(
      'nav',
      { 'data-testid': 'breadcrumb', 'aria-label': 'breadcrumb' },
      current
        ? React.createElement(
            'span',
            { key: 'current', 'data-testid': 'breadcrumb-current' },
            current.title as string
          )
        : null,
      entityName
        ? React.createElement(
            'span',
            { key: 'entity', 'data-testid': 'breadcrumb-entity' },
            entityName
          )
        : null
    )
  },
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const singleItem: MenuItem = {
  id: 'dashboard',
  type: 'single',
  title: 'Dashboard',
  href: '/admin/dashboard',
  icon: 'LayoutDashboard',
}

const groupItem: MenuItem = {
  id: 'cadastro',
  type: 'group',
  title: 'Cadastro',
  icon: 'Folder',
  children: [
    {
      id: 'clientes',
      type: 'single',
      title: 'Clientes',
      href: '/admin/clientes',
    },
    {
      id: 'produtos',
      type: 'single',
      title: 'Produtos',
      href: '/admin/produtos',
    },
  ],
}

const separatorItem: MenuItem = { id: 'sep1', type: 'separator' }

const menuConfig: MenuItem[] = [singleItem, separatorItem, groupItem]

const defaultProps = {
  menuConfig,
  children: React.createElement(
    'main',
    { 'data-testid': 'page-content' },
    'Page Content'
  ),
}

// ─── Tests ───────────────────────────────────────────────────────────────────

/** Opens the lazy palette via the shell's Cmd+K listener and waits for the chunk. */
async function openPalette() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    )
  })
  await screen.findByTestId('command-palette')
}

describe('AdminShell', () => {
  beforeEach(() => {
    capturedCommandItems = []
    vi.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders children inside the main content area', () => {
      render(React.createElement(AdminShell, defaultProps))
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
      expect(screen.getByText('Page Content')).toBeInTheDocument()
    })

    it('renders the ModernSidebar with menuConfig', () => {
      render(React.createElement(AdminShell, defaultProps))
      expect(screen.getByTestId('modern-sidebar')).toBeInTheDocument()
      // Both menu items should appear (separator is skipped)
      expect(screen.getByTestId('menu-item-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('menu-item-cadastro')).toBeInTheDocument()
    })

    it('renders the ResponsiveBreadcrumb', () => {
      render(React.createElement(AdminShell, defaultProps))
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    })

    it('loads the CommandPalette only after Cmd+K', async () => {
      render(React.createElement(AdminShell, defaultProps))
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()
      await openPalette()
      expect(screen.getByTestId('command-palette')).toBeInTheDocument()
    })

    it('passes systemName to the sidebar', () => {
      render(
        React.createElement(AdminShell, {
          ...defaultProps,
          systemName: 'Acme Assets',
        })
      )
      expect(screen.getByLabelText('Acme Assets')).toBeInTheDocument()
    })

    it('renders headerActions slot when provided', () => {
      const headerActions = React.createElement(
        'button',
        { 'data-testid': 'bell-btn' },
        'Bell'
      )
      render(
        React.createElement(AdminShell, { ...defaultProps, headerActions })
      )
      expect(screen.getByTestId('bell-btn')).toBeInTheDocument()
    })

    it('does not render the headerActions container when not provided', () => {
      render(React.createElement(AdminShell, defaultProps))
      // The action slot wrapper should not exist when headerActions is undefined
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    })
  })

  // ── CommandPalette population ──────────────────────────────────────────────

  describe('CommandPalette items', () => {
    it('flattens single menu items into navigation CommandPaletteItems', async () => {
      render(React.createElement(AdminShell, defaultProps))
      await openPalette()
      const dashboardItem = capturedCommandItems.find(i => i.id === 'dashboard')
      expect(dashboardItem).toBeDefined()
      expect(dashboardItem?.type).toBe('navigation')
      expect(dashboardItem?.href).toBe('/admin/dashboard')
    })

    it('flattens group children with "Group > Child" label', async () => {
      render(React.createElement(AdminShell, defaultProps))
      await openPalette()
      const clientesItem = capturedCommandItems.find(i => i.id === 'clientes')
      expect(clientesItem).toBeDefined()
      expect(clientesItem?.label).toBe('Cadastro > Clientes')
    })

    it('skips separator items', async () => {
      render(React.createElement(AdminShell, defaultProps))
      await openPalette()
      const separatorEntry = capturedCommandItems.find(i => i.id === 'sep1')
      expect(separatorEntry).toBeUndefined()
    })

    it('appends commandActions after navigation items', async () => {
      const logoutAction: CommandPaletteItem = {
        id: 'action-logout',
        label: 'Sair',
        type: 'action',
        onSelect: vi.fn(),
      }
      render(
        React.createElement(AdminShell, {
          ...defaultProps,
          commandActions: [logoutAction],
        })
      )
      await openPalette()
      const logoutEntry = capturedCommandItems.find(
        i => i.id === 'action-logout'
      )
      expect(logoutEntry).toBeDefined()
      expect(logoutEntry?.type).toBe('action')
    })

    it('sets onSelect that calls router.push with the item href', async () => {
      render(React.createElement(AdminShell, defaultProps))
      await openPalette()
      const dashboardItem = capturedCommandItems.find(i => i.id === 'dashboard')
      expect(dashboardItem?.onSelect).toBeDefined()
      dashboardItem?.onSelect?.()
      expect(routerPushSpy).toHaveBeenCalledWith('/admin/dashboard')
    })
  })

  // ── Permission filtering ───────────────────────────────────────────────────

  describe('Permission filtering (can)', () => {
    const guardedMenu: MenuItem[] = [
      { ...singleItem, permission: 'dashboard.view' },
      separatorItem,
      groupItem,
    ]

    it('hides a denied item from the sidebar and the command palette', async () => {
      render(
        <AdminShell menuConfig={guardedMenu} can={() => false}>
          <div />
        </AdminShell>
      )
      expect(
        screen.queryByTestId('menu-item-dashboard')
      ).not.toBeInTheDocument()
      expect(screen.getByTestId('menu-item-cadastro')).toBeInTheDocument()
      await openPalette()
      expect(capturedCommandItems.map(i => i.id)).toEqual([
        'clientes',
        'produtos',
      ])
    })

    it('keeps labeling the current route in the breadcrumb from the full menu', () => {
      render(
        <AdminShell menuConfig={guardedMenu} can={() => false}>
          <div />
        </AdminShell>
      )
      expect(screen.getByTestId('breadcrumb-current')).toHaveTextContent(
        'Dashboard'
      )
    })

    it('shows a granted item', () => {
      const can = vi.fn((p: string) => p === 'dashboard.view')
      render(
        <AdminShell menuConfig={guardedMenu} can={can}>
          <div />
        </AdminShell>
      )
      expect(screen.getByTestId('menu-item-dashboard')).toBeInTheDocument()
      expect(can).toHaveBeenCalledWith('dashboard.view')
    })

    it('shows every item when can is not set', () => {
      render(
        <AdminShell menuConfig={guardedMenu}>
          <div />
        </AdminShell>
      )
      expect(screen.getByTestId('menu-item-dashboard')).toBeInTheDocument()
    })
  })

  // ── Breadcrumb passthrough ─────────────────────────────────────────────────

  describe('Breadcrumb', () => {
    it('passes entityName to the breadcrumb via breadcrumbProps', () => {
      render(
        React.createElement(AdminShell, {
          ...defaultProps,
          breadcrumbProps: { entityName: 'Produto #42' },
        })
      )
      expect(screen.getByTestId('breadcrumb-entity')).toHaveTextContent(
        'Produto #42'
      )
    })
  })

  // ── Edge Cases ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('renders with an empty menuConfig without crashing', async () => {
      render(
        React.createElement(AdminShell, {
          menuConfig: [],
          children: React.createElement('span', {}, 'ok'),
        })
      )
      await openPalette()
      expect(screen.getByText('ok')).toBeInTheDocument()
      expect(capturedCommandItems).toHaveLength(0)
    })

    it('renders with undefined commandActions without crashing', () => {
      render(React.createElement(AdminShell, defaultProps))
      // No assertion needed — just must not throw
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })

    it('applies contentClassName to the scrollable main element', () => {
      const { container } = render(
        React.createElement(AdminShell, {
          ...defaultProps,
          contentClassName: 'test-content-class',
        })
      )
      const main = container.querySelector('main')
      expect(main).toHaveClass('test-content-class')
    })
  })

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has a landmark breadcrumb with aria-label', () => {
      render(React.createElement(AdminShell, defaultProps))
      expect(
        screen.getByRole('navigation', { name: 'breadcrumb' })
      ).toBeInTheDocument()
    })

    it('has a sticky <header> element', () => {
      const { container } = render(
        React.createElement(AdminShell, defaultProps)
      )
      expect(container.querySelector('header')).toBeInTheDocument()
    })

    it('has a <main> element wrapping children', () => {
      const { container } = render(
        React.createElement(AdminShell, defaultProps)
      )
      expect(container.querySelector('main')).toBeInTheDocument()
    })

    it('repassa compactLogoHeight/compactLogoMaxWidth/logoMaxWidth ao ModernSidebar', () => {
      render(
        <AdminShell
          menuConfig={[]}
          compactLogoHeight={28}
          compactLogoMaxWidth={40}
          logoMaxWidth={160}
        >
          <div />
        </AdminShell>
      )
      const nav = screen.getByTestId('modern-sidebar')
      expect(nav).toHaveAttribute('data-compact-logo-height', '28')
      expect(nav).toHaveAttribute('data-compact-logo-max-width', '40')
      expect(nav).toHaveAttribute('data-logo-max-width', '160')
    })
  })
})
