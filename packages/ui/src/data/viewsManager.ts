/**
 * Views Manager
 *
 * Manages saved views for DataTable with localStorage persistence.
 * Allows users to save, load, and manage custom table configurations.
 */

import { VisibilityState } from '@tanstack/react-table'
import { SortField } from '../types/pagination'
import { QueryGroup } from './queryBuilderUtils'
import { logger } from '../utils/logger'

export interface SavedView {
  id: string
  name: string
  isDefault: boolean
  config: {
    columnVisibility: VisibilityState
    columnOrder: string[]
    columnSizing: Record<string, number>
    sorting: SortField[]
    filters: {
      search?: string
      queryBuilder?: QueryGroup
      columnFilters?: Record<string, unknown>
    }
  }
  createdAt: Date
  updatedAt: Date
}

const STORAGE_PREFIX = 'telamonjs_views_'

/**
 * Get storage key for a table
 */
function getStorageKey(tableId: string): string {
  return `${STORAGE_PREFIX}${tableId}`
}

/**
 * Validate a saved view object
 */
function isValidView(view: unknown): view is SavedView {
  if (!view || typeof view !== 'object') return false

  const v = view as Partial<SavedView>

  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.isDefault === 'boolean' &&
    typeof v.config === 'object' &&
    v.config !== null &&
    v.createdAt !== undefined &&
    v.updatedAt !== undefined
  )
}

/**
 * Parse dates in saved view
 */
function parseViewDates(view: SavedView): SavedView {
  return {
    ...view,
    createdAt: new Date(view.createdAt),
    updatedAt: new Date(view.updatedAt),
  }
}

/**
 * Load all views for a table
 */
export function loadViews(tableId: string): SavedView[] {
  const key = getStorageKey(tableId)
  try {
    const stored = localStorage.getItem(key)

    if (!stored) return []

    const views = JSON.parse(stored) as unknown[]

    // Validate and parse each view
    return views
      .filter(isValidView)
      .map(parseViewDates)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  } catch (error) {
    logger.error('Failed to load views from localStorage', {
      error: error instanceof Error ? error.message : String(error),
      key: key,
      tableId: tableId,
    })
    return []
  }
}

/**
 * Save a view to localStorage
 */
export function saveView(tableId: string, view: SavedView): void {
  const key = getStorageKey(tableId)
  try {
    const views = loadViews(tableId)

    // Check if view with same ID exists
    const existingIndex = views.findIndex(v => v.id === view.id)

    if (existingIndex !== -1) {
      // Update existing view
      views[existingIndex] = {
        ...view,
        updatedAt: new Date(),
      }
    } else {
      // Add new view
      views.push({
        ...view,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(views))
  } catch (error) {
    logger.error('Failed to save view to localStorage', {
      error: error instanceof Error ? error.message : String(error),
      viewId: view.id,
      key: key,
      tableId: tableId,
    })
    throw new Error('Failed to save view')
  }
}

/**
 * Delete a view
 */
export function deleteView(tableId: string, viewId: string): void {
  const key = getStorageKey(tableId)
  try {
    const views = loadViews(tableId)
    const filtered = views.filter(v => v.id !== viewId)

    localStorage.setItem(key, JSON.stringify(filtered))
  } catch (error) {
    logger.error('Failed to delete view from localStorage', {
      error: error instanceof Error ? error.message : String(error),
      viewId: viewId,
      key: key,
      tableId: tableId,
    })
    throw new Error('Failed to delete view')
  }
}

/**
 * Set a view as default (unsets all other defaults)
 */
export function setDefaultView(tableId: string, viewId: string): void {
  const key = getStorageKey(tableId)
  try {
    const views = loadViews(tableId)

    // Unset all defaults
    const updated = views.map(v => ({
      ...v,
      isDefault: v.id === viewId,
      updatedAt: v.id === viewId ? new Date() : v.updatedAt,
    }))

    localStorage.setItem(key, JSON.stringify(updated))
  } catch (error) {
    logger.error('Failed to set default view in localStorage', {
      error: error instanceof Error ? error.message : String(error),
      viewId: viewId,
      key: key,
      tableId: tableId,
    })
    throw new Error('Failed to set default view')
  }
}

/**
 * Get the default view for a table
 */
export function getDefaultView(tableId: string): SavedView | null {
  const views = loadViews(tableId)
  return views.find(v => v.isDefault) || null
}

/**
 * Rename a view
 */
export function renameView(
  tableId: string,
  viewId: string,
  newName: string
): void {
  const key = getStorageKey(tableId)
  try {
    const views = loadViews(tableId)
    const view = views.find(v => v.id === viewId)

    if (!view) {
      throw new Error('View not found')
    }

    view.name = newName
    view.updatedAt = new Date()

    localStorage.setItem(key, JSON.stringify(views))
  } catch (error) {
    logger.error('Failed to rename view in localStorage', {
      error: error instanceof Error ? error.message : String(error),
      viewId: viewId,
      newName: newName,
      key: key,
      tableId: tableId,
    })
    throw new Error('Failed to rename view')
  }
}

/**
 * Duplicate a view
 */
export function duplicateView(
  tableId: string,
  viewId: string,
  newName: string | undefined,
  /** i18n suffix for the copy name — required, e.g. `t('list.duplicateSuffix')`. */
  copySuffix: string
): SavedView {
  const key = getStorageKey(tableId)
  try {
    const views = loadViews(tableId)
    const view = views.find(v => v.id === viewId)

    if (!view) {
      throw new Error('View not found')
    }

    const newView: SavedView = {
      ...view,
      id: `${tableId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: newName || `${view.name} ${copySuffix}`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    saveView(tableId, newView)
    return newView
  } catch (error) {
    logger.error('Failed to duplicate view', {
      error: error instanceof Error ? error.message : String(error),
      viewId: viewId,
      newName: newName,
      key: key,
      tableId: tableId,
    })
    throw new Error('Failed to duplicate view')
  }
}

/**
 * Create a new view
 */
export function createView(
  tableId: string,
  name: string,
  config: SavedView['config'],
  isDefault = false
): SavedView {
  const view: SavedView = {
    id: `${tableId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name,
    isDefault,
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  saveView(tableId, view)
  return view
}

/**
 * Import view from JSON
 */
export function importViewFromJSON(tableId: string, json: string): SavedView {
  const key = getStorageKey(tableId)
  try {
    const view = JSON.parse(json) as SavedView

    if (!isValidView(view)) {
      throw new Error('Invalid view format')
    }

    // Generate new ID and dates
    const newView: SavedView = {
      ...view,
      id: `${tableId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    saveView(tableId, newView)
    return newView
  } catch (error) {
    logger.error('Failed to import view', {
      error: error instanceof Error ? error.message : String(error),
      json: json.substring(0, 50),
      key: key,
      tableId: tableId,
    })
    throw new Error('Failed to import view')
  }
}

/**
 * Encode view config as URL-safe base64 (for sharing via URL)
 */
export function encodeViewConfig(config: SavedView['config']): string {
  try {
    const json = JSON.stringify(config)
    const base64 = btoa(json)
    // Make URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch (error) {
    logger.error('Failed to encode view config to base64', {
      error: error instanceof Error ? error.message : String(error),
    })
    return ''
  }
}
