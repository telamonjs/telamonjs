'use client'

import React from 'react'
import { useLocale } from 'next-intl'
import { Input } from '../../ui/input'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer } from './types'

/** Partial decimal input accepted while typing: `-`, `12`, `12.`, `12,5`, `.5`. */
const PARTIAL_DECIMAL = /^-?\d*([.,]\d*)?$/
/** `number` fields are integers (legacy `parseInt` contract): only digits and a leading `-`. */
const PARTIAL_INTEGER = /^-?\d*$/

/** `"12,5"` → `12.5`; `""`/`"-"`/`"."` → `undefined`. Accepts `,` or `.` as decimal separator. */
export function parseLocaleNumber(raw: string): number | undefined {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') return undefined
  const n = Number(normalized)
  return Number.isNaN(n) ? undefined : n
}

/** Field value → text in the active locale's decimal separator, without grouping (stays editable). */
function formatNumberForInput(value: unknown, locale: string): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : parseLocaleNumber(String(value))
  if (n === undefined || Number.isNaN(n)) return ''
  return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(n)
}

interface NumericInputProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same untyped merged RHF field as FieldRendererProps.field
  field: any
  /**
   * `number`: integer, emits a number and `null` when empty — `null` (not `undefined`)
   * because react-hook-form's `useController` falls back to the field's default value
   * for `undefined`, so clearing an edit form would silently restore the old value.
   * `float`: decimal, keeps the legacy dot-decimal string (`0` when empty).
   */
  mode: 'number' | 'float'
}

/**
 * Controlled numeric input that keeps the typed text while editing — the
 * intermediate `12.`/`12,` is never rewritten by the parsed value — and shows
 * the value with the locale's decimal separator when not focused.
 */
function NumericInput({ field, mode }: NumericInputProps) {
  const locale = useLocale()
  const [draft, setDraft] = React.useState<string | null>(null)

  const accessibilityAttrs = getFieldAccessibilityAttrs({
    name: field.name,
    label: field.label,
    required: field.required,
    error: field.error,
    description: field.description,
  })

  return React.createElement(Input, {
    type: 'text',
    inputMode: mode === 'number' ? 'numeric' : 'decimal',
    ...accessibilityAttrs,
    name: field.name,
    value: draft ?? formatNumberForInput(field.value, locale),
    onFocus: () => setDraft(formatNumberForInput(field.value, locale)),
    onBlur: (evt: React.FocusEvent<HTMLInputElement>) => {
      setDraft(null)
      field.onBlur?.(evt)
    },
    ref: field.ref,
    placeholder: field.placeholder,
    autoFocus: field.focus,
    readOnly: field.readOnly,
    disabled: field.disabled,
    required: field.required,
    onChange: (evt: React.ChangeEvent<HTMLInputElement>) => {
      const raw = evt.target.value
      if (!(mode === 'number' ? PARTIAL_INTEGER : PARTIAL_DECIMAL).test(raw)) return
      setDraft(raw)
      const n = parseLocaleNumber(raw)
      if (n !== undefined) field.onChange(mode === 'number' ? n : String(n))
      else if (raw === '') field.onChange(mode === 'number' ? null : 0)
      // partial without digits (`-`, `,`): keep the draft, emit nothing yet
    },
  })
}

export const NumberRenderer: FieldRenderer = {
  render: ({ field }) => React.createElement(NumericInput, { field, mode: 'number' }),
}

export const FloatRenderer: FieldRenderer = {
  render: ({ field }) => React.createElement(NumericInput, { field, mode: 'float' }),
}

function formatCurrencyDisplay(value: unknown, locale: string): string {
  const num = value === null || value === undefined || value === '' ? 0 : (parseLocaleNumber(String(value)) ?? 0)
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}

/** Cents-shift mask (typing `1250` → `12,50`); display follows the active locale. */
function CurrencyInput({ field }: { field: NumericInputProps['field'] }) {
  const locale = useLocale()
  const accessibilityAttrs = getFieldAccessibilityAttrs({
    name: field.name,
    label: field.label,
    required: field.required,
    error: field.error,
    description: field.description,
  })

  return React.createElement(Input, {
    type: 'text',
    inputMode: 'numeric',
    ...accessibilityAttrs,
    name: field.name,
    value: formatCurrencyDisplay(field.value, locale),
    onBlur: field.onBlur,
    ref: field.ref,
    placeholder: formatCurrencyDisplay(0, locale),
    autoFocus: field.focus,
    readOnly: field.readOnly,
    required: field.required,
    onChange: (evt: React.ChangeEvent<HTMLInputElement>) => {
      const digits = evt.target.value.replace(/\D/g, '')
      const cents = parseInt(digits, 10) || 0
      field.onChange((cents / 100).toFixed(2))
    },
  })
}

export const CurrencyRenderer: FieldRenderer = {
  render: ({ field }) => React.createElement(CurrencyInput, { field }),
}
