import { describe, expect, it, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { updateMenuItems } from './menu-updater.js'

const MENU_TS_TEMPLATE = `import type { MenuItem } from '@telamonjs/ui'

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
`

const LEGACY_MENU_ITEMS_TEMPLATE = `import { Users } from 'lucide-react'
import type { IconComponent } from '@telamonjs/ui'

export const menuItems: MenuItem[] = [
  {
    id: 'usuarios',
    type: 'single' as const,
    title: 'Usuários',
    href: '/admin/usuarios',
    icon: Users as IconComponent,
  },
]
`

describe('updateMenuItems', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('inserts a top-level item into the current menu.ts format (string icons), even with a nested group', async () => {
    dir = mkdtempSync(join(tmpdir(), 'menu-updater-'))
    mkdirSync(join(dir, 'src', 'config'), { recursive: true })
    const menuPath = join(dir, 'src', 'config', 'menu.ts')
    writeFileSync(menuPath, MENU_TS_TEMPLATE, 'utf-8')

    const updated = await updateMenuItems(
      { name: 'produtos', path: 'src/app/admin/produtos' },
      dir
    )

    expect(updated).toBe(true)
    const content = readFileSync(menuPath, 'utf-8')

    expect(content).toContain("id: 'produtos'")
    expect(content).toContain("icon: 'Package'")
    // Must land AFTER the admin-group block closes (top level), not inside
    // its nested children array.
    const adminGroupEnd = content.indexOf('],', content.indexOf('children: ['))
    const produtosIndex = content.indexOf("id: 'produtos'")
    expect(produtosIndex).toBeGreaterThan(adminGroupEnd)
    // The nested children array must stay intact with only its original item.
    const childrenBlock = content.slice(content.indexOf('children: ['), adminGroupEnd)
    expect(childrenBlock).not.toContain("id: 'produtos'")
  })

  it('inserts an item into the legacy menu-items.ts format (component icon cast)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'menu-updater-'))
    mkdirSync(join(dir, 'src', 'config'), { recursive: true })
    const menuPath = join(dir, 'src', 'config', 'menu-items.ts')
    writeFileSync(menuPath, LEGACY_MENU_ITEMS_TEMPLATE, 'utf-8')

    const updated = await updateMenuItems(
      { name: 'produtos', path: 'src/app/admin/produtos', icon: 'Package' },
      dir
    )

    expect(updated).toBe(true)
    const content = readFileSync(menuPath, 'utf-8')
    expect(content).toContain("id: 'produtos'")
    expect(content).toContain('icon: Package as IconComponent')
  })

  it('returns false when neither menu.ts nor menu-items.ts exists', async () => {
    dir = mkdtempSync(join(tmpdir(), 'menu-updater-'))
    const updated = await updateMenuItems(
      { name: 'produtos', path: 'src/app/admin/produtos' },
      dir
    )
    expect(updated).toBe(false)
  })
})
