'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { useUrlSync } from '../../hooks/useUrlSync'
import type { DialogAction, DialogState } from './dialog-state'

/**
 * Resolved query-param names for each deep-linkable dialog. A param is only
 * present here when the consumer configured `dialogs.<type>.urlParam`.
 */
export interface DialogUrlParams {
  view?: string
  edit?: string
  create?: string
}

/** Sentinel written for the id-less create dialog (`?create=1`). */
const CREATE_SENTINEL = '1'

/**
 * Delay before the URL param is cleared on CLOSE. Covers the Radix exit
 * animation (`duration-200`) + margin: the navigation triggered by
 * `router.replace` must not re-render/unmount the dialog while its
 * DismissableLayer is still animating out — that left `body` with
 * `pointer-events: none` and a `[data-state=closed]` dialog mounted (consumer QA).
 */
export const DIALOG_CLOSE_URL_DELAY_MS = 300

/** Structural equality for the discriminated dialog state. */
function dialogStateEquals(a: DialogState, b: DialogState): boolean {
  return a.type === b.type && a.id === b.id
}

/**
 * Derive the dialog state the URL is asking for, from the current query params.
 *
 * Precedence `edit > view > create` — in normal operation only one dialog param
 * is ever present (the writer deletes the others on every transition); the order
 * only disambiguates a malformed URL carrying several at once.
 */
function deriveStateFromUrl(
  params: DialogUrlParams,
  getParam: (key: string) => string | null
): DialogState {
  if (params.edit) {
    const id = getParam(params.edit)
    if (id) return { type: 'edit', id }
  }
  if (params.view) {
    const id = getParam(params.view)
    if (id) return { type: 'view', id }
  }
  if (params.create && getParam(params.create)) {
    return { type: 'create', id: null }
  }
  return { type: null, id: null }
}

/** Serialize only the dialog-owned params into a stable comparison key. */
function urlKeyFor(
  params: DialogUrlParams,
  getParam: (key: string) => string | null
): string {
  return [params.view, params.edit, params.create]
    .filter((p): p is string => Boolean(p))
    .map(p => `${p}=${getParam(p) ?? ''}`)
    .join('&')
}

interface UseDialogUrlSyncParams {
  /** Resolved param names (empty object disables the whole mechanism). */
  params: DialogUrlParams
  /** Current dialog state from the reducer. */
  state: DialogState
  /** Reducer dispatch (URL → state direction). */
  dispatch: (action: DialogAction) => void
  /**
   * Ref to the ListPage root element. Used to gate URL→state *opening*: when
   * several ListPages share one param name and are co-mounted on the same route
   * (keep-alive tab dashboards), only the visible one may open from the URL.
   * Closing is never gated. When absent (standalone ListPage), always visible.
   */
  rootRef?: RefObject<HTMLElement | null>
}

/**
 * useDialogUrlSync - bidirectional URL ↔ dialog-state synchronization (internal)
 *
 * Owns the entire relationship between the ListPage dialog state machine and the
 * URL query params. A single reconciliation effect keeps both directions in sync
 * without feedback loops:
 *
 * - **URL → state** (external change wins): deep-link on load, client-side nav,
 *   browser back/forward, or a sibling writer (`?tab`) changing the URL dispatch
 *   `syncFromUrl` so the dialog opens/closes to match the address bar.
 * - **state → URL** (user action wins): opening/closing a dialog writes the param
 *   via `router.replace` (no history spam), merging into existing params so
 *   `?tab`/`?page`/`?sort`/filters are never clobbered.
 *
 * Arbitration uses `prevUrlKey`: if the URL changed since the last run the URL
 * wins; otherwise the state changed and we write it out. The equality guard
 * short-circuits every potential ping-pong. The mount/deep-link case falls out
 * for free (the URL leads, state catches up) — no mount-only effect, no ref hack.
 *
 * @internal Sibling of useListPageUrlSync (which owns page/sort/filter params).
 */
export function useDialogUrlSync({
  params,
  state,
  dispatch,
  rootRef,
}: UseDialogUrlSyncParams): void {
  const { getParam, setParams } = useUrlSync()

  const hasAnyParam = Boolean(params.view || params.edit || params.create)
  const urlKey = hasAnyParam ? urlKeyFor(params, getParam) : ''

  // Sentinel `undefined` on first run so the initial URL is always treated as an
  // external change → a deep-link param opens its dialog on mount.
  const prevUrlKey = useRef<string | undefined>(undefined)

  // The deferred close write must use the CURRENT params (a sibling `?tab`/`?page`
  // may have changed during the delay), not the snapshot of the closing render.
  const setParamsRef = useRef(setParams)
  useEffect(() => {
    setParamsRef.current = setParams
  })

  useEffect(() => {
    if (!hasAnyParam) return undefined

    const desiredFromUrl = deriveStateFromUrl(params, getParam)

    if (dialogStateEquals(desiredFromUrl, state)) {
      prevUrlKey.current = urlKey
      return undefined
    }

    const urlChanged = urlKey !== prevUrlKey.current

    if (urlChanged) {
      // URL moved (deep-link, back/forward, link, tab nav) → URL is authoritative.
      //
      // We intentionally do NOT advance `prevUrlKey` here. The URL is only marked
      // as "consumed" once the state actually reconciles to it (the equality
      // branch above). Advancing now would break arbitration whenever this effect
      // runs again before the `dispatch` has committed — React StrictMode double-
      // invokes effects in dev, and the visibility gate below can return without
      // opening — because the next pass would see `urlChanged === false` with the
      // dialog still closed and fall into the `else` branch, deleting the param
      // that just arrived from the URL (so a deep-link wouldn't open on mount).
      // Leaving `prevUrlKey` untouched makes re-runs simply repeat the idempotent
      // dispatch until the state catches up.
      //
      // The gate: only *open* a dialog from the URL if this ListPage is visible.
      // With keep-alive tab dashboards, multiple ListPages sharing one param name
      // (e.g. several `?view`) stay mounted; without this gate every hidden tab
      // would open its own dialog for an id that isn't theirs. Closing
      // (desiredFromUrl = closed) is always honored so back/forward still works.
      const isOpening = desiredFromUrl.type !== null

      // The URL only has authority over dialogs it can represent. When it asks to
      // CLOSE (desiredFromUrl = closed) but the currently-open dialog is a type
      // whose `urlParam` isn't configured, that "close" is spurious — the URL
      // never owned this dialog. This is the view→edit handoff when only `view`
      // has a urlParam: flipping the state to `edit` runs the state→URL branch
      // which strips `?view`, and that strip must NOT then be read back as "close
      // the edit". Keep the dialog open; just consume the URL change.
      if (!isOpening && state.type !== null && !params[state.type]) {
        prevUrlKey.current = urlKey
        return undefined
      }

      const isVisible =
        !rootRef || !rootRef.current || rootRef.current.offsetParent !== null
      if (isOpening && !isVisible) return undefined
      dispatch({ kind: 'syncFromUrl', next: desiredFromUrl })
      return undefined
    } else {
      // Only the dialog state moved → write it into the URL atomically.
      prevUrlKey.current = urlKey
      const updates: Record<string, string | undefined> = {}
      if (params.view) {
        updates[params.view] = state.type === 'view' ? state.id : undefined
      }
      if (params.edit) {
        updates[params.edit] = state.type === 'edit' ? state.id : undefined
      }
      if (params.create) {
        updates[params.create] =
          state.type === 'create' ? CREATE_SENTINEL : undefined
      }
      // `push` when opening/switching to a URL-representable dialog so it gets a
      // history entry → the browser Back button closes it. `replace` when closing
      // (state.type === null) or switching to a dialog the URL can't represent
      // (no urlParam) — that write only cleans up the old param, so it shouldn't
      // add a history entry. This branch only runs on user-driven *updates* (row
      // click, handoff, close), never on mount, so StrictMode's mount-only double-
      // invoke can't double-push.
      const willHaveParam = state.type !== null && Boolean(params[state.type])
      if (state.type !== null) {
        setParams(updates, { replace: !willHaveParam })
        return undefined
      }
      // Closing: clear the param only after the exit animation. If the state
      // moves again (reopen, another row) before that, the cleanup cancels it
      // and the next run writes the new state instead.
      const timer = setTimeout(
        () => setParamsRef.current(updates, { replace: true }),
        DIALOG_CLOSE_URL_DELAY_MS
      )
      return () => clearTimeout(timer)
    }
    // getParam/setParams come from useUrlSync, whose identity changes on every
    // searchParams update; depending on them would re-run this effect after each
    // write. We intentionally key on the serialized `urlKey` + `state` instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey, state, hasAnyParam])
}
