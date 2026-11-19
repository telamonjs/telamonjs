'use client'

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { useMemo } from 'react'
import type { MenuItem, GroupMenuItem } from '../types/menu'
import type { I18nText } from '../i18n/msg'

/**
 * Modern Menu Store for telamonjs-v2
 * Manages hierarchical navigation stack for sidebar menu
 */

// Module-level timeout tracking for cleanup (Zustand stores don't have refs)
let sectionClickTimeout: NodeJS.Timeout | null = null
let backClickTimeout: NodeJS.Timeout | null = null

export type MenuLevel = 'sections' | 'items'

export interface MenuStackItem {
  level: MenuLevel
  title: I18nText
  items: MenuItem[]
  parentSection?: GroupMenuItem
}

export interface MenuState {
  // State
  menuStack: MenuStackItem[]
  currentSection: GroupMenuItem | null
  lastInteraction: 'click' | 'navigation' | 'init' | null
  isNavigating: boolean

  // Actions
  pushToMenuStack: (item: MenuStackItem) => void
  popFromMenuStack: () => void
  clearMenuStack: () => void
  resetToHome: () => void
  setCurrentSection: (section: GroupMenuItem | null) => void
  detectSectionFromPath: (pathname: string) => void
  handleSectionClick: (section: GroupMenuItem) => void
  handleBackClick: () => void
  setIsNavigating: (navigating: boolean) => void
  setLastInteraction: (
    interaction: 'click' | 'navigation' | 'init' | null
  ) => void
}

export const useMenuStore = create<MenuState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      menuStack: [],
      currentSection: null,
      isNavigating: false,
      lastInteraction: null,

      // Menu stack actions
      pushToMenuStack: (item: MenuStackItem) =>
        set(state => ({
          menuStack: [...state.menuStack, item],
          lastInteraction: 'click',
        })),

      popFromMenuStack: () =>
        set(state => ({
          menuStack: state.menuStack.slice(0, -1),
          lastInteraction: 'click',
        })),

      clearMenuStack: () =>
        set({
          menuStack: [],
          currentSection: null,
          lastInteraction: 'click',
        }),

      resetToHome: () =>
        set({
          menuStack: [],
          currentSection: null,
          lastInteraction: 'navigation',
        }),

      setCurrentSection: (section: GroupMenuItem | null) =>
        set({ currentSection: section }),

      // Smart navigation handlers
      detectSectionFromPath: (pathname: string) => {
        const state = get()

        // Only auto-detect if there was no recent user interaction
        if (state.lastInteraction === 'click') {
          return
        }

        // Resetar stack se estiver na home
        if (pathname === '/admin' || pathname === '/') {
          set({
            menuStack: [],
            currentSection: null,
            lastInteraction: null,
          })
          return
        }

        // This function will be called by the Sidebar when menuConfig is available
        // For now, just clears the state if needed
      },

      handleSectionClick: (section: GroupMenuItem) => {
        const state = get()

        // Cleanup previous timeout to prevent accumulation
        if (sectionClickTimeout) {
          clearTimeout(sectionClickTimeout)
          sectionClickTimeout = null
        }

        set({
          menuStack: [
            ...state.menuStack,
            {
              level: 'items' as MenuLevel,
              title: section.title || '',
              items: section.children || [],
              parentSection: section,
            },
          ],
          currentSection: section,
          lastInteraction: 'click',
        })

        // Reset interaction after navigation completes
        sectionClickTimeout = setTimeout(() => {
          set({ lastInteraction: null })
          sectionClickTimeout = null
        }, 1000)
      },

      handleBackClick: () => {
        const state = get()

        // Cleanup previous timeout to prevent accumulation
        if (backClickTimeout) {
          clearTimeout(backClickTimeout)
          backClickTimeout = null
        }

        if (state.menuStack.length > 0) {
          const newStack = state.menuStack.slice(0, -1)
          const newCurrentSection =
            newStack.length > 0
              ? newStack[newStack.length - 1].parentSection || null
              : null

          set({
            menuStack: newStack,
            currentSection: newCurrentSection,
            lastInteraction: 'click',
          })

          // Reset interaction after navigation completes
          backClickTimeout = setTimeout(() => {
            set({ lastInteraction: null })
            backClickTimeout = null
          }, 500)
        }
      },

      // Interaction tracking
      setIsNavigating: (navigating: boolean) =>
        set({ isNavigating: navigating }),

      setLastInteraction: (
        interaction: 'click' | 'navigation' | 'init' | null
      ) => set({ lastInteraction: interaction }),
    })),
    {
      name: 'TelamonJS Menu Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Selector hooks for optimized re-renders
export const useMenuStack = () => useMenuStore(state => state.menuStack)
export const useCurrentSection = () =>
  useMenuStore(state => state.currentSection)
export const useIsNavigating = () => useMenuStore(state => state.isNavigating)

// Action hooks - Performance: useMemo para evitar novo objeto a cada render
export const useMenuActions = () => {
  return useMemo(
    () => ({
      pushToMenuStack: useMenuStore.getState().pushToMenuStack,
      popFromMenuStack: useMenuStore.getState().popFromMenuStack,
      clearMenuStack: useMenuStore.getState().clearMenuStack,
      resetToHome: useMenuStore.getState().resetToHome,
      setCurrentSection: useMenuStore.getState().setCurrentSection,
      detectSectionFromPath: useMenuStore.getState().detectSectionFromPath,
      handleSectionClick: useMenuStore.getState().handleSectionClick,
      handleBackClick: useMenuStore.getState().handleBackClick,
      setIsNavigating: useMenuStore.getState().setIsNavigating,
      setLastInteraction: useMenuStore.getState().setLastInteraction,
    }),
    []
  )
}

// Debug hook for development
export const useMenuDebug = () =>
  useMenuStore(state => ({
    menuStack: state.menuStack,
    currentSection: state.currentSection,
    lastInteraction: state.lastInteraction,
    isNavigating: state.isNavigating,
  }))
