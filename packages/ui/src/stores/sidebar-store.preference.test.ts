import { describe, it, expect } from 'vitest'
import { useSidebarStore } from './sidebar-store'
import {
  SIDEBAR_COMPACT_ATTR,
  SIDEBAR_PREFERENCE_SCRIPT,
} from './sidebar-preference'

describe('sidebar compact preference before hydration', () => {
  it('keeps the <html> mark in sync with the store', () => {
    useSidebarStore.getState().collapseSidebar()
    expect(document.documentElement.getAttribute(SIDEBAR_COMPACT_ATTR)).toBe(
      'compact'
    )
    useSidebarStore.getState().expandSidebar()
    expect(document.documentElement.hasAttribute(SIDEBAR_COMPACT_ATTR)).toBe(
      false
    )
  })

  it('inline script marks <html> from the persisted preference', () => {
    localStorage.setItem(
      'telamonjs-sidebar-state',
      JSON.stringify({ state: { sidebarState: 'compact' }, version: 0 })
    )
    document.documentElement.removeAttribute(SIDEBAR_COMPACT_ATTR)
    new Function(SIDEBAR_PREFERENCE_SCRIPT)()
    expect(document.documentElement.getAttribute(SIDEBAR_COMPACT_ATTR)).toBe(
      'compact'
    )

    localStorage.setItem('telamonjs-sidebar-state', 'not json')
    document.documentElement.removeAttribute(SIDEBAR_COMPACT_ATTR)
    expect(() => new Function(SIDEBAR_PREFERENCE_SCRIPT)()).not.toThrow()
    expect(document.documentElement.hasAttribute(SIDEBAR_COMPACT_ATTR)).toBe(
      false
    )
  })
})
