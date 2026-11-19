import type { MenuItem } from '@telamonjs/ui'

/**
 * Application menu configuration.
 *
 * Icons are passed as STRINGS and resolved internally by AdminShell
 * via `getIcon()` — never import Lucide components directly here.
 *
 * MenuItem type from the lib:
 *   - type: 'single' | 'group' | 'separator'
 *   - single: { id, type, title, href, icon? }
 *   - group:  { id, type, title, icon?, children: SingleMenuItem[] }
 */
export const menuConfig: MenuItem[] = [
  {
    id: 'dashboard',
    type: 'single',
    title: 'Dashboard',
    href: '/admin',
    icon: 'LayoutDashboard',
  },
  {
    id: 'admin-group',
    type: 'group',
    title: 'Administração',
    icon: 'Settings',
    children: [
      {
        id: 'usuarios',
        type: 'single',
        title: 'Usuários',
        href: '/admin/usuarios',
        icon: 'Users',
      },
    ],
  },
]
