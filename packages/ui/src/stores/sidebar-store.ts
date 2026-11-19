'use client'

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { useMemo } from 'react'
import { SIDEBAR_COMPACT_ATTR, SIDEBAR_STORAGE_KEY } from './sidebar-preference'

/**
 * Modern Sidebar Store for telamonjs-v2
 * Manages sidebar state (expanded, compact, hidden) and mobile menu
 */

export type SidebarState = 'expanded' | 'compact' | 'hidden'

export interface SidebarStoreState {
  // State
  sidebarState: SidebarState
  isMobileOpen: boolean

  // Actions
  setSidebarState: (state: SidebarState) => void
  toggleSidebar: () => void
  expandSidebar: () => void
  collapseSidebar: () => void
  hideSidebar: () => void
  setMobileOpen: (open: boolean) => void
  toggleMobile: () => void
}

export const useSidebarStore = create<SidebarStoreState>()(
  devtools(
    subscribeWithSelector(
      persist(
        set => ({
          // Initial state
          sidebarState: 'expanded',
          isMobileOpen: false,

          // Sidebar actions
          setSidebarState: (state: SidebarState) =>
            set({ sidebarState: state }),

          toggleSidebar: () =>
            set(state => ({
              sidebarState:
                state.sidebarState === 'expanded'
                  ? 'compact'
                  : state.sidebarState === 'compact'
                    ? 'expanded'
                    : 'expanded',
            })),

          expandSidebar: () => set({ sidebarState: 'expanded' }),

          collapseSidebar: () => set({ sidebarState: 'compact' }),

          hideSidebar: () => set({ sidebarState: 'hidden' }),

          // Mobile actions
          setMobileOpen: (open: boolean) => set({ isMobileOpen: open }),

          toggleMobile: () =>
            set(state => ({ isMobileOpen: !state.isMobileOpen })),
        }),
        {
          name: SIDEBAR_STORAGE_KEY,
          partialize: state => ({ sidebarState: state.sidebarState }),
          // localStorage is synchronous, so the store would read the saved
          // preference while being created and the first client render would
          // differ from the server's (hydration mismatch, shifted Radix ids).
          // ModernSidebar calls persist.rehydrate() after mount instead.
          skipHydration: true,
        }
      )
    ),
    {
      name: 'TelamonJS Sidebar Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Keeps the <html> mark read by the pre-hydration CSS in sync (see
// sidebar-preference.ts).
if (typeof document !== 'undefined') {
  useSidebarStore.subscribe(
    state => state.sidebarState,
    sidebarState => {
      if (sidebarState === 'compact')
        document.documentElement.setAttribute(SIDEBAR_COMPACT_ATTR, 'compact')
      else document.documentElement.removeAttribute(SIDEBAR_COMPACT_ATTR)
    }
  )
}

// Selector hooks for optimized re-renders
export const useSidebarState = () =>
  useSidebarStore(state => state.sidebarState)

export const useIsMobileOpen = () =>
  useSidebarStore(state => state.isMobileOpen)

export const useIsCompact = () =>
  useSidebarStore(state => state.sidebarState === 'compact')

export const useIsExpanded = () =>
  useSidebarStore(state => state.sidebarState === 'expanded')

export const useIsHidden = () =>
  useSidebarStore(state => state.sidebarState === 'hidden')

// Action hooks - Performance: useMemo para evitar novo objeto a cada render
export const useSidebarActions = () => {
  return useMemo(
    () => ({
      setSidebarState: useSidebarStore.getState().setSidebarState,
      toggleSidebar: useSidebarStore.getState().toggleSidebar,
      expandSidebar: useSidebarStore.getState().expandSidebar,
      collapseSidebar: useSidebarStore.getState().collapseSidebar,
      hideSidebar: useSidebarStore.getState().hideSidebar,
      setMobileOpen: useSidebarStore.getState().setMobileOpen,
      toggleMobile: useSidebarStore.getState().toggleMobile,
    }),
    []
  )
}
