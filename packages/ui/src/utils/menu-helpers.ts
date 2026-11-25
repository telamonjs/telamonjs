import type { MenuItem, GroupMenuItem, SingleMenuItem } from '../types/menu'
import { actionGranted } from '../components/data/action-access'

/**
 * Menu Helper Utilities for telamonjs-v2
 * Provides helper functions for menu manipulation and filtering
 */

/**
 * The menu a user may see: items whose `permission` (any of them) `can` grants.
 * Same check as a CrudConfig action's `permission`; an item without one stays.
 *
 * A denied group goes with its children; a group whose children are all denied
 * goes too, unless it has its own `href` (then it stays as a link). Separators
 * left leading, trailing or doubled by the filtering are dropped. The input is
 * not mutated.
 *
 * @example
 * ```ts
 * // with @telamonjs/permissions
 * const visible = filterMenuByPermission(menuConfig, perm =>
 *   checker.can(session.user, perm)
 * )
 * ```
 */
export function filterMenuByPermission(
  menu: MenuItem[],
  can: (permission: string) => boolean
): MenuItem[] {
  const granted = (item: MenuItem) =>
    actionGranted(item.permission, undefined, can)
  const kept: MenuItem[] = []

  for (const item of menu) {
    if (!granted(item)) continue
    if (item.type === 'group') {
      const children = item.children.filter(granted) as SingleMenuItem[]
      if (children.length > 0 || item.href) kept.push({ ...item, children })
    } else if (item.type === 'separator') {
      if (kept.length > 0 && kept[kept.length - 1].type !== 'separator') {
        kept.push(item)
      }
    } else {
      kept.push(item)
    }
  }

  if (kept[kept.length - 1]?.type === 'separator') kept.pop()
  return kept
}

// Filter menu by user role
export function filterMenuByRole<TRole extends string>(
  menu: MenuItem[],
  userRole: TRole,
  // Not a real MenuItem key — consumers attach a custom role field to their
  // own menu items, so this reads it dynamically by name.
  roleField: string = 'roles'
): MenuItem[] {
  return menu
    .filter(item => {
      const roles = (item as unknown as Record<string, unknown>)[
        roleField
      ] as TRole[] | undefined
      return !roles || roles.includes(userRole)
    })
    .map(item => {
      if (item.type === 'group') {
        return {
          ...item,
          children: filterMenuByRole(
            item.children as SingleMenuItem[],
            userRole,
            roleField
          ),
        } as GroupMenuItem
      }
      return item
    })
    .filter(
      item =>
        item.type !== 'group' ||
        (item.type === 'group' && item.children.length > 0)
    ) as MenuItem[]
}

// Find menu item by ID
export function findMenuItemById(
  menu: MenuItem[],
  id: string
): MenuItem | null {
  for (const item of menu) {
    if (item.id === id) return item
    if (item.type === 'group') {
      const found = findMenuItemById(item.children, id)
      if (found) return found
    }
  }
  return null
}

// Find menu item by href
export function findMenuItemByHref(
  menu: MenuItem[],
  href: string
): SingleMenuItem | GroupMenuItem | null {
  for (const item of menu) {
    if (item.type === 'single' && item.href === href) {
      return item
    }
    if (item.type === 'group') {
      if (item.href === href) return item
      const found = findMenuItemByHref(item.children, href)
      if (found) return found
    }
  }
  return null
}

// Get breadcrumb path for a menu item
export function getBreadcrumbPath(
  menu: MenuItem[],
  targetHref: string,
  path: (SingleMenuItem | GroupMenuItem)[] = []
): (SingleMenuItem | GroupMenuItem)[] | null {
  for (const item of menu) {
    if (item.type === 'separator') continue

    const currentPath = [...path, item as SingleMenuItem | GroupMenuItem]

    if (
      (item.type === 'single' || item.type === 'group') &&
      item.href === targetHref
    ) {
      return currentPath
    }

    if (item.type === 'group') {
      const found = getBreadcrumbPath(item.children, targetHref, currentPath)
      if (found) return found
    }
  }

  return null
}

// Sort menu items by priority
export function sortMenuByPriority(menu: MenuItem[]): MenuItem[] {
  return [...menu]
    .sort((a, b) => {
      const priorityA = a.priority ?? 999
      const priorityB = b.priority ?? 999
      return priorityA - priorityB
    })
    .map(item => {
      if (item.type === 'group') {
        return {
          ...item,
          children: sortMenuByPriority(item.children as SingleMenuItem[]),
        } as GroupMenuItem
      }
      return item
    }) as MenuItem[]
}

// Get all single menu items (flatten groups)
export function getAllSingleItems(menu: MenuItem[]): SingleMenuItem[] {
  const items: SingleMenuItem[] = []

  for (const item of menu) {
    if (item.type === 'single') {
      items.push(item)
    } else if (item.type === 'group') {
      items.push(...getAllSingleItems(item.children))
    }
  }

  return items
}

// Check if pathname matches menu item
export function isMenuItemActive(
  item: SingleMenuItem | GroupMenuItem,
  pathname: string
): boolean {
  if (item.type === 'single') {
    return pathname.startsWith(item.href)
  }

  if (item.type === 'group') {
    if (item.href && pathname.startsWith(item.href)) {
      return true
    }
    return item.children.some(
      child => child.type === 'single' && pathname.startsWith(child.href)
    )
  }

  return false
}

// Get active section from pathname
export function getActiveSectionFromPath(
  menu: MenuItem[],
  pathname: string
): GroupMenuItem | null {
  for (const item of menu) {
    if (item.type === 'group') {
      if (item.href && pathname.startsWith(item.href)) {
        return item
      }
      const isChildActive = item.children.some(
        child => child.type === 'single' && pathname.startsWith(child.href)
      )
      if (isChildActive) return item
    }
  }
  return null
}

// Count total menu items
export function countMenuItems(menu: MenuItem[]): {
  total: number
  single: number
  group: number
  separator: number
} {
  let total = 0
  let single = 0
  let group = 0
  let separator = 0

  for (const item of menu) {
    total++
    if (item.type === 'single') single++
    if (item.type === 'separator') separator++
    if (item.type === 'group') {
      group++
      const childCount = countMenuItems(item.children)
      total += childCount.total
      single += childCount.single
      group += childCount.group
      separator += childCount.separator
    }
  }

  return { total, single, group, separator }
}

// Validate menu config
export function validateMenuConfig(menu: MenuItem[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const ids = new Set<string>()

  function validate(items: MenuItem[], path: string = 'root') {
    items.forEach((item, index) => {
      const itemPath = `${path}[${index}]`

      // Check ID uniqueness
      if (ids.has(item.id)) {
        errors.push(`Duplicate ID "${item.id}" at ${itemPath}`)
      }
      ids.add(item.id)

      // Check required fields
      if (item.type === 'single') {
        if (!item.title) {
          errors.push(`Missing title for single item at ${itemPath}`)
        }
        if (!item.href) {
          errors.push(`Missing href for single item at ${itemPath}`)
        }
      }

      if (item.type === 'group') {
        if (!item.title) {
          errors.push(`Missing title for group at ${itemPath}`)
        }
        if (!item.children || item.children.length === 0) {
          errors.push(`Empty children for group at ${itemPath}`)
        } else {
          validate(item.children, `${itemPath}.children`)
        }
      }
    })
  }

  validate(menu)

  return {
    valid: errors.length === 0,
    errors,
  }
}
