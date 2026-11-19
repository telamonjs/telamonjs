'use client'

import type { ReactNode } from 'react'
import { useWatch, type UseFormReturn, type FieldValues } from 'react-hook-form'

export interface ConditionalFieldProps {
  form: UseFormReturn<FieldValues>
  visibleWhen: (values: Record<string, unknown>) => boolean
  children: () => ReactNode
}

/**
 * Gates a field or section behind a `visibleWhen` predicate, re-evaluated
 * reactively via `useWatch`. Only rendered for fields/sections that actually
 * declare `visibleWhen` — fields without it skip this component entirely,
 * so they never subscribe and never re-render on someone else's keystroke.
 * `useWatch`'s subscription is isolated to this component instance, so a
 * conditional field re-rendering on every value change never re-renders the
 * rest of AdminForm (no global re-render per keystroke).
 */
export function ConditionalField({
  form,
  visibleWhen,
  children,
}: ConditionalFieldProps) {
  const values = useWatch({ control: form.control }) as Record<
    string,
    unknown
  >
  if (!visibleWhen(values)) return null
  return <>{children()}</>
}
