'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useFormContext } from 'react-hook-form'

const noopSubscribe = () => () => {}

/**
 * Value of the form field named `name`, re-rendering only the caller when that
 * field changes. Replaces `formMethods.watch(name)` in render, which re-renders
 * the whole form root and is missed by memoized field renderers.
 * Returns `undefined` outside a FormProvider or without a name.
 */
export function useDependentValue(name?: string): unknown {
  // Typed non-null, but null outside a FormProvider.
  const form = useFormContext() as ReturnType<typeof useFormContext> | null
  const watch = form?.watch

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!watch || !name) return noopSubscribe()
      const sub = watch((_values, { name: changed }) => {
        // `changed` is undefined on reset/setValue of the whole form
        if (!changed || changed === name || changed.startsWith(`${name}.`))
          onChange()
      })
      return () => sub.unsubscribe()
    },
    [watch, name]
  )
  const getSnapshot = () => (form && name ? form.getValues(name) : undefined)

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
