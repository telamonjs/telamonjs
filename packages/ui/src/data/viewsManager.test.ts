import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createView,
  deleteView,
  duplicateView,
  encodeViewConfig,
  getDefaultView,
  importViewFromJSON,
  loadViews,
  renameView,
  saveView,
  setDefaultView,
  type SavedView,
} from './viewsManager'

vi.mock('../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const TABLE = 'users'
const KEY = `telamonjs_views_${TABLE}`

const config: SavedView['config'] = {
  columnVisibility: { email: false },
  columnOrder: ['name', 'email'],
  columnSizing: { name: 200 },
  sorting: [{ field: 'name', order: 'asc' }],
  filters: { search: 'ana' },
}

function view(overrides: Partial<SavedView> = {}): SavedView {
  return {
    id: 'v1',
    name: 'Mine',
    isDefault: false,
    config,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

const store = (value: unknown) => localStorage.setItem(KEY, JSON.stringify(value))

beforeEach(() => {
  localStorage.clear()
})

describe('loadViews', () => {
  describe('Rendering', () => {
    it('returns an empty list when nothing is stored', () => {
      expect(loadViews(TABLE)).toEqual([])
    })

    it('revives the dates and sorts by most recently updated', () => {
      store([
        view({ id: 'old', updatedAt: new Date('2026-01-01T00:00:00Z') }),
        view({ id: 'new', updatedAt: new Date('2026-03-01T00:00:00Z') }),
      ])

      const views = loadViews(TABLE)
      expect(views.map(v => v.id)).toEqual(['new', 'old'])
      expect(views[0].createdAt).toBeInstanceOf(Date)
      expect(views[0].updatedAt.toISOString()).toBe('2026-03-01T00:00:00.000Z')
    })

    it('keeps each table under its own key', () => {
      store([view()])
      expect(loadViews('orders')).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    it('returns an empty list for corrupt JSON instead of throwing', () => {
      localStorage.setItem(KEY, '{not json')
      expect(loadViews(TABLE)).toEqual([])
    })

    it('returns an empty list when the stored JSON is not an array', () => {
      localStorage.setItem(KEY, '{"id":"v1"}')
      expect(loadViews(TABLE)).toEqual([])
      localStorage.setItem(KEY, 'null')
      expect(loadViews(TABLE)).toEqual([])
    })

    it('drops entries missing required keys and keeps the valid ones', () => {
      store([
        view({ id: 'ok' }),
        { id: 'no-name', isDefault: false, config, createdAt: 1, updatedAt: 1 },
        { ...view({ id: 'no-config' }), config: undefined },
        { ...view({ id: 'null-config' }), config: null },
        { ...view({ id: 'string-default' }), isDefault: 'yes' },
        'garbage',
        null,
      ])
      expect(loadViews(TABLE).map(v => v.id)).toEqual(['ok'])
    })
  })
})

describe('saveView', () => {
  describe('State Management', () => {
    it('adds a new view with fresh timestamps', () => {
      saveView(TABLE, view())
      const [saved] = loadViews(TABLE)
      expect(saved.id).toBe('v1')
      expect(saved.createdAt.getTime()).toBeGreaterThan(new Date('2026-01-01').getTime())
    })

    it('replaces a view with the same id instead of duplicating it', () => {
      saveView(TABLE, view())
      saveView(TABLE, view({ name: 'Renamed' }))
      const views = loadViews(TABLE)
      expect(views).toHaveLength(1)
      expect(views[0].name).toBe('Renamed')
    })

    it('overwrites corrupt storage rather than failing', () => {
      localStorage.setItem(KEY, '{not json')
      saveView(TABLE, view())
      expect(loadViews(TABLE).map(v => v.id)).toEqual(['v1'])
    })
  })

  describe('Edge Cases', () => {
    it('throws a stable error when storage refuses the write', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      try {
        expect(() => saveView(TABLE, view())).toThrow('Failed to save view')
      } finally {
        setItem.mockRestore()
      }
    })
  })
})

describe('view operations', () => {
  beforeEach(() => {
    store([view({ id: 'a', isDefault: true }), view({ id: 'b', name: 'Other' })])
  })

  it('deleteView removes only the given view', () => {
    deleteView(TABLE, 'a')
    expect(loadViews(TABLE).map(v => v.id)).toEqual(['b'])
  })

  it('setDefaultView leaves exactly one default', () => {
    setDefaultView(TABLE, 'b')
    const defaults = loadViews(TABLE).filter(v => v.isDefault)
    expect(defaults.map(v => v.id)).toEqual(['b'])
    expect(getDefaultView(TABLE)?.id).toBe('b')
  })

  it('getDefaultView returns null when no view is default', () => {
    store([view({ id: 'a' })])
    expect(getDefaultView(TABLE)).toBeNull()
  })

  it('renameView renames and bumps updatedAt', () => {
    renameView(TABLE, 'b', 'Renamed')
    const renamed = loadViews(TABLE).find(v => v.id === 'b')!
    expect(renamed.name).toBe('Renamed')
    expect(renamed.updatedAt.getTime()).toBeGreaterThan(new Date('2026-01-01').getTime())
  })

  it('renameView throws for an unknown id', () => {
    expect(() => renameView(TABLE, 'missing', 'x')).toThrow('Failed to rename view')
  })

  it('duplicateView copies the config under a new id, never as default', () => {
    const copy = duplicateView(TABLE, 'a', undefined, '(copy)')
    expect(copy.id).not.toBe('a')
    expect(copy.id.startsWith(`${TABLE}_`)).toBe(true)
    expect(copy.name).toBe('Mine (copy)')
    expect(copy.isDefault).toBe(false)
    expect(copy.config).toEqual(config)
    expect(loadViews(TABLE)).toHaveLength(3)
  })

  it('duplicateView prefers an explicit name and throws for an unknown id', () => {
    expect(duplicateView(TABLE, 'a', 'Named', '(copy)').name).toBe('Named')
    expect(() => duplicateView(TABLE, 'missing', undefined, '(copy)')).toThrow(
      'Failed to duplicate view'
    )
  })

  it('createView saves and returns the new view', () => {
    const created = createView(TABLE, 'Fresh', config, true)
    expect(created.isDefault).toBe(true)
    expect(loadViews(TABLE).map(v => v.id)).toContain(created.id)
  })
})

describe('importViewFromJSON', () => {
  it('imports a valid view under a new id, never as default', () => {
    const imported = importViewFromJSON(TABLE, JSON.stringify(view({ isDefault: true })))
    expect(imported.id).not.toBe('v1')
    expect(imported.isDefault).toBe(false)
    expect(loadViews(TABLE).map(v => v.id)).toEqual([imported.id])
  })

  it('rejects malformed JSON and objects that are not views', () => {
    expect(() => importViewFromJSON(TABLE, '{not json')).toThrow('Failed to import view')
    expect(() => importViewFromJSON(TABLE, 'null')).toThrow('Failed to import view')
    expect(() => importViewFromJSON(TABLE, '{"id":"x"}')).toThrow('Failed to import view')
    // `typeof null === 'object'`: a null config would crash whoever applies the view
    expect(() =>
      importViewFromJSON(TABLE, JSON.stringify({ ...view(), config: null }))
    ).toThrow('Failed to import view')
    expect(loadViews(TABLE)).toEqual([])
  })
})

describe('encodeViewConfig', () => {
  const decode = (encoded: string) => {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  }

  it('produces URL-safe base64 that decodes back to the config', () => {
    const encoded = encodeViewConfig(config)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decode(encoded)).toEqual(config)
  })

  it('encodes text outside Latin-1 (accents, emoji) instead of returning an empty string', () => {
    const accented = { ...config, filters: { search: 'São João 🚚' } }
    const encoded = encodeViewConfig(accented)
    expect(encoded).not.toBe('')
    expect(decode(encoded)).toEqual(accented)
  })
})
