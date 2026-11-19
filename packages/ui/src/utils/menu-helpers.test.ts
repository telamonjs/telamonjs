/**
 * menu-helpers Test Suite
 *
 * Menu manipulation utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  filterMenuByRole,
  findMenuItemById,
  findMenuItemByHref,
  getBreadcrumbPath,
  sortMenuByPriority,
  getAllSingleItems,
  isMenuItemActive,
  getActiveSectionFromPath,
  countMenuItems,
  validateMenuConfig,
} from './menu-helpers'
import type { MenuItem, SingleMenuItem, GroupMenuItem } from '../types/menu'

describe('menu-helpers', () => {
  // Sample menu for testing
  const sampleMenu: MenuItem[] = [
    {
      id: 'dashboard',
      type: 'single',
      title: 'Dashboard',
      href: '/admin',
      priority: 1,
      roles: ['ADMIN', 'USER'],
    } as SingleMenuItem,
    {
      id: 'users',
      type: 'group',
      title: 'Users',
      href: '/admin/users',
      priority: 2,
      roles: ['ADMIN'],
      children: [
        {
          id: 'users-list',
          type: 'single',
          title: 'List Users',
          href: '/admin/users/list',
        } as SingleMenuItem,
        {
          id: 'users-add',
          type: 'single',
          title: 'Add User',
          href: '/admin/users/add',
        } as SingleMenuItem,
      ],
    } as GroupMenuItem,
    {
      id: 'sep-1',
      type: 'separator',
    },
    {
      id: 'settings',
      type: 'single',
      title: 'Settings',
      href: '/admin/settings',
      priority: 3,
      roles: ['ADMIN'],
    } as SingleMenuItem,
  ]

  describe('filterMenuByRole', () => {
    it('filters menu items by role', () => {
      const result = filterMenuByRole(sampleMenu, 'USER')

      // Should include dashboard and separator
      expect(result.length).toBeGreaterThan(0)
      expect(result.find(item => item.id === 'dashboard')).toBeDefined()
      // Settings is ADMIN-only, should not be included
      expect(result.find(item => item.id === 'settings')).toBeUndefined()
    })

    it('includes items without role restrictions', () => {
      const menu: MenuItem[] = [
        {
          id: 'public',
          type: 'single',
          title: 'Public',
          href: '/public',
        } as SingleMenuItem,
      ]

      const result = filterMenuByRole(menu, 'USER')
      expect(result).toHaveLength(1)
    })

    it('filters group children by role', () => {
      const result = filterMenuByRole(sampleMenu, 'ADMIN')
      const usersGroup = result.find(
        item => item.id === 'users'
      ) as GroupMenuItem

      expect(usersGroup).toBeDefined()
      expect(usersGroup.children).toHaveLength(2)
    })

    it('removes empty groups after filtering', () => {
      const menu: MenuItem[] = [
        {
          id: 'admin-only-group',
          type: 'group',
          title: 'Admin Only',
          roles: ['SUPER_ADMIN'],
          children: [
            {
              id: 'admin-item',
              type: 'single',
              title: 'Admin Item',
              href: '/admin/item',
            } as SingleMenuItem,
          ],
        } as GroupMenuItem,
      ]

      const result = filterMenuByRole(menu, 'USER')
      expect(result).toHaveLength(0)
    })
  })

  describe('findMenuItemById', () => {
    it('finds top-level menu item', () => {
      const result = findMenuItemById(sampleMenu, 'dashboard')

      expect(result).toBeDefined()
      expect(result?.id).toBe('dashboard')
    })

    it('finds nested menu item', () => {
      const result = findMenuItemById(sampleMenu, 'users-list')

      expect(result).toBeDefined()
      expect(result?.id).toBe('users-list')
    })

    it('returns null for non-existent item', () => {
      const result = findMenuItemById(sampleMenu, 'non-existent')

      expect(result).toBeNull()
    })

    it('finds group item', () => {
      const result = findMenuItemById(sampleMenu, 'users')

      expect(result).toBeDefined()
      expect(result?.type).toBe('group')
    })
  })

  describe('findMenuItemByHref', () => {
    it('finds menu item by href', () => {
      const result = findMenuItemByHref(sampleMenu, '/admin')

      expect(result).toBeDefined()
      expect(result?.id).toBe('dashboard')
    })

    it('finds nested item by href', () => {
      const result = findMenuItemByHref(sampleMenu, '/admin/users/list')

      expect(result).toBeDefined()
      expect(result?.id).toBe('users-list')
    })

    it('finds group by href', () => {
      const result = findMenuItemByHref(sampleMenu, '/admin/users')

      expect(result).toBeDefined()
      expect(result?.type).toBe('group')
    })

    it('returns null for non-existent href', () => {
      const result = findMenuItemByHref(sampleMenu, '/non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getBreadcrumbPath', () => {
    it('returns path for top-level item', () => {
      const result = getBreadcrumbPath(sampleMenu, '/admin')

      expect(result).toHaveLength(1)
      expect(result?.[0].id).toBe('dashboard')
    })

    it('returns path for nested item', () => {
      const result = getBreadcrumbPath(sampleMenu, '/admin/users/list')

      expect(result).toHaveLength(2)
      expect(result?.[0].id).toBe('users')
      expect(result?.[1].id).toBe('users-list')
    })

    it('returns null for non-existent href', () => {
      const result = getBreadcrumbPath(sampleMenu, '/non-existent')

      expect(result).toBeNull()
    })

    it('includes group in path', () => {
      const result = getBreadcrumbPath(sampleMenu, '/admin/users')

      expect(result).toHaveLength(1)
      expect(result?.[0].type).toBe('group')
    })
  })

  describe('sortMenuByPriority', () => {
    it('sorts menu items by priority', () => {
      const unsorted: MenuItem[] = [
        {
          id: '3',
          type: 'single',
          title: 'C',
          href: '/c',
          priority: 3,
        } as SingleMenuItem,
        {
          id: '1',
          type: 'single',
          title: 'A',
          href: '/a',
          priority: 1,
        } as SingleMenuItem,
        {
          id: '2',
          type: 'single',
          title: 'B',
          href: '/b',
          priority: 2,
        } as SingleMenuItem,
      ]

      const result = sortMenuByPriority(unsorted)

      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('2')
      expect(result[2].id).toBe('3')
    })

    it('sorts items without priority to end', () => {
      const unsorted: MenuItem[] = [
        {
          id: 'no-priority',
          type: 'single',
          title: 'No Priority',
          href: '/np',
        } as SingleMenuItem,
        {
          id: 'priority-1',
          type: 'single',
          title: 'Priority 1',
          href: '/p1',
          priority: 1,
        } as SingleMenuItem,
      ]

      const result = sortMenuByPriority(unsorted)

      expect(result[0].id).toBe('priority-1')
      expect(result[1].id).toBe('no-priority')
    })

    it('sorts group children', () => {
      const menu: MenuItem[] = [
        {
          id: 'group',
          type: 'group',
          title: 'Group',
          children: [
            {
              id: 'child-2',
              type: 'single',
              title: 'B',
              href: '/b',
              priority: 2,
            } as SingleMenuItem,
            {
              id: 'child-1',
              type: 'single',
              title: 'A',
              href: '/a',
              priority: 1,
            } as SingleMenuItem,
          ],
        } as GroupMenuItem,
      ]

      const result = sortMenuByPriority(menu)
      const group = result[0] as GroupMenuItem

      expect(group.children[0].id).toBe('child-1')
      expect(group.children[1].id).toBe('child-2')
    })
  })

  describe('getAllSingleItems', () => {
    it('returns all single items from flat menu', () => {
      const menu: MenuItem[] = [
        {
          id: 'item-1',
          type: 'single',
          title: 'Item 1',
          href: '/1',
        } as SingleMenuItem,
        {
          id: 'item-2',
          type: 'single',
          title: 'Item 2',
          href: '/2',
        } as SingleMenuItem,
      ]

      const result = getAllSingleItems(menu)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('item-1')
      expect(result[1].id).toBe('item-2')
    })

    it('flattens group children', () => {
      const result = getAllSingleItems(sampleMenu)

      expect(result).toHaveLength(4) // dashboard, users-list, users-add, settings
      expect(result.find(item => item.id === 'users-list')).toBeDefined()
    })

    it('returns empty array for empty menu', () => {
      expect(getAllSingleItems([])).toHaveLength(0)
    })

    it('excludes group and separator items', () => {
      const result = getAllSingleItems(sampleMenu)

      expect(result.every(item => item.type === 'single')).toBe(true)
    })
  })

  describe('isMenuItemActive', () => {
    it('returns true for matching single item', () => {
      const item: SingleMenuItem = {
        id: 'dashboard',
        type: 'single',
        title: 'Dashboard',
        href: '/admin',
      }

      expect(isMenuItemActive(item, '/admin')).toBe(true)
      expect(isMenuItemActive(item, '/admin/users')).toBe(true) // startsWith
    })

    it('returns false for non-matching single item', () => {
      const item: SingleMenuItem = {
        id: 'dashboard',
        type: 'single',
        title: 'Dashboard',
        href: '/admin',
      }

      expect(isMenuItemActive(item, '/public')).toBe(false)
    })

    it('returns true for group with matching href', () => {
      const item: GroupMenuItem = {
        id: 'users',
        type: 'group',
        title: 'Users',
        href: '/admin/users',
        children: [],
      }

      expect(isMenuItemActive(item, '/admin/users')).toBe(true)
    })

    it('returns true for group with active child', () => {
      const item: GroupMenuItem = {
        id: 'users',
        type: 'group',
        title: 'Users',
        children: [
          {
            id: 'users-list',
            type: 'single',
            title: 'List',
            href: '/admin/users/list',
          } as SingleMenuItem,
        ],
      }

      expect(isMenuItemActive(item, '/admin/users/list')).toBe(true)
    })

    it('returns false for group with no active children', () => {
      const item: GroupMenuItem = {
        id: 'users',
        type: 'group',
        title: 'Users',
        children: [
          {
            id: 'users-list',
            type: 'single',
            title: 'List',
            href: '/admin/users/list',
          } as SingleMenuItem,
        ],
      }

      expect(isMenuItemActive(item, '/admin/products')).toBe(false)
    })
  })

  describe('getActiveSectionFromPath', () => {
    it('returns active group section', () => {
      const result = getActiveSectionFromPath(sampleMenu, '/admin/users/list')

      expect(result).toBeDefined()
      expect(result?.id).toBe('users')
    })

    it('returns group with matching href', () => {
      const result = getActiveSectionFromPath(sampleMenu, '/admin/users')

      expect(result).toBeDefined()
      expect(result?.id).toBe('users')
    })

    it('returns null for non-group active item', () => {
      const result = getActiveSectionFromPath(sampleMenu, '/admin')

      expect(result).toBeNull()
    })

    it('returns null for non-existent path', () => {
      const result = getActiveSectionFromPath(sampleMenu, '/non-existent')

      expect(result).toBeNull()
    })
  })

  describe('countMenuItems', () => {
    it('counts all menu item types', () => {
      const result = countMenuItems(sampleMenu)

      // Total: dashboard, users (group), users-list, users-add, sep-1, settings = 6 items at root
      // But users (group) contains 2 children, so total = 6 + 2 children = 8 items recursively
      // Actually: root items = 4, children = 2, total with nesting = 6
      expect(result.single).toBe(4) // dashboard, users-list, users-add, settings
      expect(result.group).toBe(1) // users group
      expect(result.separator).toBe(1) // sep-1
      expect(result.total).toBe(6) // Total items counted
    })

    it('counts empty menu', () => {
      const result = countMenuItems([])

      expect(result).toEqual({
        total: 0,
        single: 0,
        group: 0,
        separator: 0,
      })
    })

    it('counts nested groups recursively', () => {
      const menu: MenuItem[] = [
        {
          id: 'parent',
          type: 'group',
          title: 'Parent',
          children: [
            {
              id: 'child-group',
              type: 'group',
              title: 'Child Group',
              children: [
                {
                  id: 'nested-item',
                  type: 'single',
                  title: 'Nested',
                  href: '/nested',
                } as SingleMenuItem,
              ],
            } as GroupMenuItem,
          ],
        } as GroupMenuItem,
      ]

      const result = countMenuItems(menu)

      expect(result.total).toBe(3) // parent, child-group, nested-item
      expect(result.group).toBe(2)
      expect(result.single).toBe(1)
    })
  })

  describe('validateMenuConfig', () => {
    it('validates correct menu config', () => {
      const result = validateMenuConfig(sampleMenu)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('detects duplicate IDs', () => {
      const menu: MenuItem[] = [
        {
          id: 'duplicate',
          type: 'single',
          title: 'A',
          href: '/a',
        } as SingleMenuItem,
        {
          id: 'duplicate',
          type: 'single',
          title: 'B',
          href: '/b',
        } as SingleMenuItem,
      ]

      const result = validateMenuConfig(menu)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Duplicate ID "duplicate" at root[1]')
    })

    it('detects missing title in single item', () => {
      const menu: MenuItem[] = [
        { id: 'no-title', type: 'single', href: '/test' } as any,
      ]

      const result = validateMenuConfig(menu)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Missing title'))).toBe(true)
    })

    it('detects missing href in single item', () => {
      const menu: MenuItem[] = [
        { id: 'no-href', type: 'single', title: 'Test' } as any,
      ]

      const result = validateMenuConfig(menu)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Missing href'))).toBe(true)
    })

    it('detects empty children in group', () => {
      const menu: MenuItem[] = [
        {
          id: 'empty-group',
          type: 'group',
          title: 'Empty',
          children: [],
        } as GroupMenuItem,
      ]

      const result = validateMenuConfig(menu)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Empty children'))).toBe(true)
    })

    it('validates nested groups', () => {
      const menu: MenuItem[] = [
        {
          id: 'parent',
          type: 'group',
          title: 'Parent',
          children: [
            { id: 'child-no-href', type: 'single', title: 'Child' } as any,
          ],
        } as GroupMenuItem,
      ]

      const result = validateMenuConfig(menu)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Missing href'))).toBe(true)
    })
  })
})
