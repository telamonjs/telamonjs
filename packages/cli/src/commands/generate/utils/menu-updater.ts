/**
 * Utility to automatically update the app's menu config (menu.ts, or the
 * legacy menu-items.ts) with a new module entry.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { capitalize } from './formatters.js'

export interface MenuUpdateOptions {
  name: string
  path: string
  icon?: string
  group?: string
}

/**
 * Add a menu item to the app's menu config file.
 *
 * Supports both the current template format (`src/config/menu.ts`, icons as
 * plain strings resolved via `getIcon()`) and the legacy `menu-items.ts`
 * format (icons as imported components cast `as IconComponent`).
 */
export async function updateMenuItems(
  options: MenuUpdateOptions,
  cwd: string = process.cwd()
): Promise<boolean> {
  const possiblePaths = [
    join(cwd, 'src', 'config', 'menu.ts'),
    join(cwd, 'src', 'config', 'menu-items.ts'),
    join(cwd, 'config', 'menu.ts'),
    join(cwd, 'config', 'menu-items.ts'),
    join(cwd, 'src', 'lib', 'menu-items.ts'),
  ]

  let menuFilePath: string | null = null

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      menuFilePath = path
      break
    }
  }

  if (!menuFilePath) {
    console.warn('⚠️  menu.ts / menu-items.ts not found. Skipping menu update.')
    return false
  }

  try {
    const content = readFileSync(menuFilePath, 'utf-8')

    if (content.includes(`id: '${options.name}'`)) {
      console.warn(`⚠️  Menu item '${options.name}' already exists. Skipping.`)
      return false
    }

    const icon = options.icon || guessIconFromName(options.name)
    // Legacy menu-items.ts imports icon components and casts them; the
    // current menu.ts template passes icons as plain strings (getIcon()).
    const usesComponentIcons = /icon:\s*\w+\s+as\s+IconComponent/.test(content)

    const menuItemCode = generateMenuItemCode(
      {
        id: options.name,
        title: capitalize(options.name),
        href: options.path.replace(/^src\/app/, ''),
        icon,
      },
      usesComponentIcons
    )

    const updatedContent = insertMenuItem(content, menuItemCode)
    if (updatedContent === null) {
      console.warn('Could not find menu array definition. Appending at end.')
      writeFileSync(menuFilePath, content + '\n\n' + menuItemCode, 'utf-8')
      return true
    }

    writeFileSync(menuFilePath, updatedContent, 'utf-8')
    return true
  } catch (error) {
    console.error('Error updating menu config:', error)
    return false
  }
}

function generateMenuItemCode(
  item: { id: string; title: string; href: string; icon: string },
  usesComponentIcons: boolean
): string {
  const iconValue = usesComponentIcons
    ? `${item.icon} as IconComponent`
    : `'${item.icon}'`

  return `  {
    id: '${item.id}',
    type: 'single',
    title: '${item.title}',
    href: '${item.href}',
    icon: ${iconValue},
  },`
}

/**
 * Insert the menu item just before the closing bracket of the top-level
 * `export const <name>: MenuItem[] = [ ... ]` array, at the array's own
 * nesting depth (not inside a nested `children: [...]` array).
 *
 * Returns null if no such array could be located.
 */
function insertMenuItem(content: string, menuItemCode: string): string | null {
  const declMatch = content.match(/export\s+const\s+\w+\s*:\s*MenuItem\[\]\s*=\s*\[/)
  if (!declMatch || declMatch.index === undefined) {
    return null
  }

  const arrayOpenIndex = declMatch.index + declMatch[0].length - 1 // index of the '['
  let depth = 0
  for (let i = arrayOpenIndex; i < content.length; i++) {
    const char = content[i]
    if (char === '[') depth++
    else if (char === ']') {
      depth--
      if (depth === 0) {
        // Insert right before this top-level closing bracket.
        return content.slice(0, i) + '\n' + menuItemCode + '\n' + content.slice(i)
      }
    }
  }

  return null
}

/**
 * Guess appropriate icon based on module name
 */
function guessIconFromName(name: string): string {
  const iconMap: Record<string, string> = {
    user: 'Users',
    users: 'Users',
    client: 'Users',
    clients: 'Users',
    clientes: 'Users',
    product: 'Package',
    products: 'Package',
    produtos: 'Package',
    order: 'ShoppingCart',
    orders: 'ShoppingCart',
    pedidos: 'ShoppingCart',
    invoice: 'FileText',
    invoices: 'FileText',
    faturas: 'FileText',
    report: 'BarChart',
    reports: 'BarChart',
    relatorios: 'BarChart',
    settings: 'Settings',
    configuracoes: 'Settings',
    dashboard: 'LayoutDashboard',
    analytics: 'TrendingUp',
    notification: 'Bell',
    notifications: 'Bell',
    notificacoes: 'Bell',
  }

  const normalized = name.toLowerCase().replace(/-/g, '')

  for (const [key, icon] of Object.entries(iconMap)) {
    if (normalized.includes(key)) {
      return icon
    }
  }

  // Default icon
  return 'FileText'
}
