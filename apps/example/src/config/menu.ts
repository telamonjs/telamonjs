import type { MenuItem } from '@telamonjs/ui'
import { msg } from '@telamonjs/ui/i18n'

/**
 * Application menu configuration.
 *
 * Icons are passed as STRINGS and resolved internally by AdminShell
 * via `getIcon()` — never import Lucide components directly here.
 *
 * `permission` hides an item from users without it (the PermissionsProvider
 * in LayoutProviders checks it). Hiding is not access control: the page's
 * Route Handlers check the same permission server-side.
 *
 * MenuItem type from the lib:
 *   - type: 'single' | 'group' | 'separator'
 *   - single: { id, type, title, href, icon?, permission? }
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
    title: msg('nav.administration'),
    icon: 'Settings',
    children: [
      {
        id: 'usuarios',
        type: 'single',
        title: msg('nav.users'),
        href: '/admin/usuarios',
        icon: 'Users',
        permission: 'users.read',
      },
      {
        id: 'papeis',
        type: 'single',
        title: msg('nav.roles'),
        href: '/admin/papeis',
        icon: 'ShieldCheck',
        permission: 'roles.read',
      },
    ],
  },
]
