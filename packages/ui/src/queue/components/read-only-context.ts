'use client'

import { createContext, useContext } from 'react'

/**
 * `QueueTabbedDashboard readOnly`: every component that renders an action
 * changing a queue or a job (pause, retry, remove, promote, clean, drain,
 * dispatch, clear history, enable/disable, edit config) hides it.
 * @internal not exported — the public switch is the dashboard prop.
 */
export const QueueReadOnlyContext = createContext(false)

export const useQueueReadOnly = (): boolean => useContext(QueueReadOnlyContext)
