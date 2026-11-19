'use client'

import { useCallback } from 'react'
import { useUrlSync } from './useUrlSync'

export interface UseTabUrlSyncOptions {
  /**
   * Valid tab values, in order. The first entry is the fallback when the URL has
   * no (valid) tab param. Pass the values of the *visible* tabs so a stale/hidden
   * `?tab` falls back gracefully (e.g. `visibleDefs.map(d => d.value)`).
   */
  tabs: readonly string[]
  /** Override the fallback used when the URL has no valid tab. Default: `tabs[0]`. */
  defaultTab?: string
  /** Query param name. Default `'tab'`. */
  paramKey?: string
  /**
   * `'push'` (default) creates a browser history entry on tab change, so the Back
   * button returns to the previous tab. `'replace'` keeps the URL in sync without
   * a history entry.
   */
  history?: 'push' | 'replace'
}

/**
 * Same options, but with no fallback: a missing/invalid URL tab resolves to
 * `null` (a "no tab active" stage — e.g. `ContentPortal`'s grid launcher)
 * instead of `tabs[0]`.
 */
export interface UseTabUrlSyncOptionsAllowNone
  extends Omit<UseTabUrlSyncOptions, 'defaultTab'> {
  allowNone: true
}

export interface UseTabUrlSyncResult {
  /** The active tab value (URL is the single source of truth). */
  activeTab: string | undefined
  /**
   * Set the active tab — writes `?<paramKey>=<value>`, merging other params.
   * No-op when the URL already has that value.
   */
  setTab: (value: string) => void
}

export interface UseTabUrlSyncNoneResult {
  /** The active tab value, or `null` when the URL has no valid tab. */
  activeTab: string | null
  /** Set the active tab, or `null` to clear the param (no-tab stage). */
  setTab: (value: string | null) => void
}

/**
 * useTabUrlSync - URL-driven tab state with deep-link + history (shared)
 *
 * Encapsulates the "read `?tab` / write `?tab`" pattern that tab dashboards
 * (ShellPage + AdminTabs) hand-rolled with `URLSearchParams` + `router.replace`.
 * The URL is the single source of truth: deep-linking to `?tab=x` selects that
 * tab on load, and changing tabs is a `router.push` by default — so the browser
 * Back button returns to the previous tab. Other query params (`?view`, filters)
 * are preserved (merge), so it composes with the dialog deep-linking.
 *
 * @example
 * ```tsx
 * const { activeTab, setTab } = useTabUrlSync({ tabs: visibleDefs.map(d => d.value) })
 * <AdminTabs tabs={tabs} value={activeTab} onValueChange={setTab} />
 * ```
 *
 * With `allowNone: true`, a missing/invalid URL tab resolves to `null`
 * instead of falling back to `tabs[0]` — models a "grid launcher" stage
 * (e.g. `ContentPortal`) that has no tab selected yet, so a portal-driven
 * page doesn't need to drop to raw `useUrlSync`:
 * ```tsx
 * const { activeTab, setTab } = useTabUrlSync({ tabs: sectionValues, allowNone: true })
 * <ContentPortal tabs={tabs} value={activeTab} onValueChange={setTab} />
 * ```
 */
export function useTabUrlSync(
  options: UseTabUrlSyncOptionsAllowNone
): UseTabUrlSyncNoneResult
// eslint-disable-next-line no-redeclare -- TS overload signature, not a real redeclare (no @typescript-eslint/no-redeclare configured to tell them apart)
export function useTabUrlSync(
  options: UseTabUrlSyncOptions
): UseTabUrlSyncResult
// eslint-disable-next-line no-redeclare -- TS overload implementation, not a real redeclare
export function useTabUrlSync({
  tabs,
  defaultTab,
  paramKey = 'tab',
  history = 'push',
  allowNone,
}: UseTabUrlSyncOptions & {
  allowNone?: boolean
}): UseTabUrlSyncResult | UseTabUrlSyncNoneResult {
  const { getParam, setParam } = useUrlSync()

  const urlTab = getParam(paramKey)
  const isValid = urlTab !== null && tabs.includes(urlTab)
  const fallback = defaultTab ?? tabs[0]
  const activeTab = isValid ? urlTab : allowNone ? null : fallback

  const setTab = useCallback(
    (value: string | null) => {
      // Re-selecting the tab already in the URL is a no-op (no history entry,
      // no navigation that could race a dialog's ?view/?edit). An implicit
      // default (no param yet) still gets written.
      if (getParam(paramKey) === value) return
      setParam(paramKey, value, { replace: history === 'replace' })
    },
    [getParam, setParam, paramKey, history]
  )

  return { activeTab, setTab }
}
