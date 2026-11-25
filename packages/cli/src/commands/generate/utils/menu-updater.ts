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
  /** Id of a `type: 'group'` item: the entry goes into its `children` (else top level) */
  group?: string
  /** TS expression for the title, e.g. `msg('nav.audit')` (default: the quoted, capitalized name) */
  titleCode?: string
  /** `permission` of the entry: the menu hides it from users without it */
  permission?: string
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
    let updatedContent: string | null
    try {
      updatedContent = addMenuItem(content, options)
    } catch {
      console.warn('Could not find menu array definition. Appending at end.')
      writeFileSync(menuFilePath, content + '\n\n' + menuItemCode(content, options, '  '), 'utf-8')
      return true
    }
    if (updatedContent === null) {
      console.warn(`⚠️  Menu item '${options.name}' already exists. Skipping.`)
      return false
    }

    writeFileSync(menuFilePath, updatedContent, 'utf-8')
    return true
  } catch (error) {
    console.error('Error updating menu config:', error)
    return false
  }
}

/**
 * `content` (a menu config's source) with the entry added: at the end of the
 * `options.group` item's `children` when that group exists, else at the end
 * of the top-level `MenuItem[]` array. Returns null when an item with the
 * same id is already there; throws when there is no `MenuItem[]` array.
 */
export function addMenuItem(content: string, options: MenuUpdateOptions): string | null {
  if (content.includes(`id: '${options.name}'`)) return null

  const groupAt = options.group ? content.indexOf(`id: '${options.group}'`) : -1
  const childrenAt = groupAt === -1 ? -1 : content.indexOf('children: [', groupAt)
  if (childrenAt !== -1) {
    const open = childrenAt + 'children: '.length
    return insertBeforeArrayClose(content, open, menuItemCode(content, options, '      '))
  }

  const declMatch = content.match(/export\s+const\s+\w+\s*:\s*MenuItem\[\]\s*=\s*\[/)
  if (!declMatch || declMatch.index === undefined) {
    throw new Error('No `MenuItem[]` array found')
  }
  // index of the '['
  const updated = insertBeforeArrayClose(content, declMatch.index + declMatch[0].length - 1, menuItemCode(content, options, '  '))
  if (updated === null) throw new Error('Unbalanced `MenuItem[]` array')
  return updated
}

function menuItemCode(content: string, options: MenuUpdateOptions, indent: string): string {
  // Legacy menu-items.ts imports icon components and casts them; the
  // current menu.ts template passes icons as plain strings (getIcon()).
  const usesComponentIcons = /icon:\s*\w+\s+as\s+IconComponent/.test(content)
  return generateMenuItemCode(
    {
      id: options.name,
      title: options.titleCode ?? `'${capitalize(options.name)}'`,
      href: options.path.replace(/^src\/app/, ''),
      icon: options.icon || guessIconFromName(options.name),
      permission: options.permission,
    },
    usesComponentIcons,
    indent
  )
}

function generateMenuItemCode(
  item: { id: string; title: string; href: string; icon: string; permission?: string },
  usesComponentIcons: boolean,
  indent: string
): string {
  const iconValue = usesComponentIcons
    ? `${item.icon} as IconComponent`
    : `'${item.icon}'`
  const lines = [
    `id: '${item.id}',`,
    `type: 'single',`,
    `title: ${item.title},`,
    `href: '${item.href}',`,
    `icon: ${iconValue},`,
    ...(item.permission ? [`permission: '${item.permission}',`] : []),
  ]
  return [`${indent}{`, ...lines.map((line) => `${indent}  ${line}`), `${indent}},`].join('\n')
}

/**
 * Inserts `code` (whole lines) just before the `]` that closes the array
 * opened at `openIndex`, at that array's own nesting depth: a nested `[...]`
 * inside it is skipped. Returns null when the array never closes.
 */
export function insertBeforeArrayClose(content: string, openIndex: number, code: string): string | null {
  let depth = 0
  for (let i = openIndex; i < content.length; i++) {
    const char = content[i]
    if (char === '[') depth++
    else if (char === ']') {
      depth--
      if (depth === 0) {
        // `]` on a line of its own: the code takes the lines just above it
        const lineStart = content.lastIndexOf('\n', i - 1) + 1
        if (content.slice(lineStart, i).trim() === '') {
          return content.slice(0, lineStart) + code + '\n' + content.slice(lineStart)
        }
        return content.slice(0, i) + '\n' + code + '\n' + content.slice(i)
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
