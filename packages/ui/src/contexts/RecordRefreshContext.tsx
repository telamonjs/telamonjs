'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Lets a dialog that loaded a record offer a "reload the record" callback
 * to its children. The consumer is CrudField: a row added/removed in a
 * nested list changes counters that live in the dialog header (via
 * `headerConfig.stats`), and those counters come from the parent record —
 * not from the list.
 *
 * `RecordRefreshProvider` stays internal (only the dialogs that own it
 * import it directly); `useRecordRefresh` is re-exported by the public
 * barrel (`exports/stores-hooks.ts`) for consumer code inside custom
 * dialog content.
 */
const RecordRefreshContext = createContext<(() => void) | null>(null)

export function RecordRefreshProvider({
  refresh,
  children,
}: {
  refresh: () => void
  children: ReactNode
}) {
  return (
    <RecordRefreshContext.Provider value={refresh}>
      {children}
    </RecordRefreshContext.Provider>
  )
}

/** `null` when there is no parent dialog — the consumer simply doesn't call it. */
// eslint-disable-next-line react-refresh/only-export-components
export function useRecordRefresh(): (() => void) | null {
  return useContext(RecordRefreshContext)
}
