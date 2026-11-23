'use client'

import * as React from 'react'
import type { ChangeEvent } from 'react'
import { Input } from '../../ui/input'
import { format } from '@react-input/mask'
// Lazy variant keeps tiptap (~140 KB) out of the default form/field graph.
// Consumers only pay the cost when a 'richtext' field actually renders.
import { RichTextEditorLazy } from '../../components/forms/RichTextEditorLazy'
import {
  DateRangePicker,
  type DateRange,
} from '../../components/forms/DateRangePicker'
import { TimePicker } from '../../components/forms/TimePicker'
import { WizardForm } from '../../components/forms/WizardForm'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import { resolveMask } from '../mask-presets'
import type { FieldRenderer } from './types'

export const RichTextRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <RichTextEditorLazy
        {...accessibilityAttrs}
        value={field.value || ''}
        onChange={(html: string) => field.onChange(html)}
        placeholder={field.placeholder || t('form.richTextPlaceholder')}
        disabled={field.readOnly}
        minHeight={field.minHeight || 200}
        enableImages={field.enableImages !== false}
        enableTables={field.enableTables !== false}
      />
    )
  },
}

export const DateRangeRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <DateRangePicker
        {...accessibilityAttrs}
        value={field.value}
        onChange={(range: DateRange) => field.onChange(range)}
        placeholder={field.placeholder || t('form.selectRange')}
        disabled={field.readOnly}
        presets={field.presets}
        error={field.hasError ? t('validation.required') : undefined}
      />
    )
  },
}

export const TimeRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <TimePicker
        {...accessibilityAttrs}
        value={field.value || ''}
        onChange={(time: string) => field.onChange(time)}
        format={field.timeFormat || '24h'}
        step={field.step || 15}
        disabled={field.readOnly}
        placeholder={field.placeholder || t('form.selectTime')}
        error={field.hasError ? t('validation.required') : undefined}
      />
    )
  },
}

export const WizardRenderer: FieldRenderer = {
  render: ({ field, value }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <WizardForm
        {...accessibilityAttrs}
        steps={field.wizardSteps || []}
        onSubmit={field.onSubmit || (async () => {})}
        draftKey={field.draftKey}
        showReview={field.showReview !== false}
        orientation={field.orientation || 'horizontal'}
        initialData={value}
      />
    )
  },
}

export const ColorRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <div className='flex gap-2 items-center'>
        <Input
          type='color'
          {...accessibilityAttrs}
          name={field.name}
          value={field.value ?? '#000000'}
          onChange={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
          disabled={field.disabled}
          required={field.required}
          className='w-14 h-10 cursor-pointer'
        />
        <Input
          type='text'
          value={field.value ?? '#000000'}
          onChange={field.onChange}
          placeholder='#000000'
          maxLength={7}
          className='flex-1'
          disabled={field.disabled}
          aria-label={t('form.colorTextLabel', { label: field.label })}
        />
      </div>
    )
  },
}

export const RangeRenderer: FieldRenderer = {
  render: ({ field }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <div className='space-y-2'>
        <div className='flex justify-between text-sm text-muted-foreground'>
          <span>{field.min ?? 0}</span>
          <span className='font-medium text-foreground'>
            {field.value ?? field.min ?? 0}
          </span>
          <span>{field.max ?? 100}</span>
        </div>
        <input
          type='range'
          {...accessibilityAttrs}
          name={field.name}
          value={field.value ?? field.min ?? 0}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          onChange={evt => field.onChange(parseFloat(evt.target.value))}
          onBlur={field.onBlur}
          disabled={field.readOnly || field.disabled}
          required={field.required}
          className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700'
        />
      </div>
    )
  },
}

const MASK_REPLACEMENT = { _: /\d/ }
const digitsOf = (raw: string) => raw.replace(/\D/g, '')

/** Index right after the n-th digit of `text` (start of text for n = 0). */
function caretAfterDigit(text: string, n: number): number {
  if (n <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === n) return i + 1
  }
  return text.length
}

interface MaskedInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange'
  > {
  value: string
  /** Mask (`_` = one digit) for the digits about to be shown */
  maskFor: (digits: string) => string
  onValueChange: (formatted: string) => void
  inputRef?: React.Ref<HTMLInputElement>
}

/**
 * Plain controlled input that masks on every change: keeps only the digits,
 * re-applies the mask and puts the caret back after the same digit.
 *
 * Replaces `@react-input/mask`'s `InputMask` (PRD 068): its core rejects every
 * `input` event that arrives before its selection-polling `setTimeout` ticks
 * again, so a burst of keystrokes (fast typist, scanner, Playwright `type`)
 * silently dropped every key but the first.
 *
 * ponytail: a digit that is a literal of the mask (e.g. `+55 (__)`) is read as
 * typed — no consumer mask has one; walk the mask slots if one ever does.
 */
// eslint-disable-next-line react-refresh/only-export-components -- private component behind the exported renderer object
function MaskedInput({
  value,
  maskFor,
  onValueChange,
  inputRef,
  ...rest
}: MaskedInputProps) {
  const elRef = React.useRef<HTMLInputElement | null>(null)
  // Digits before the caret at the last change; applied once the new value is in the DOM.
  const pendingCaret = React.useRef<number | null>(null)
  // Forces a commit (so the caret effect runs) when the formatted value did
  // not change, e.g. a rejected letter or a backspace over a mask literal.
  const [, bump] = React.useReducer((n: number) => n + 1, 0)

  const digits = digitsOf(value)
  const shown = format(digits, { mask: maskFor(digits), replacement: MASK_REPLACEMENT })

  React.useLayoutEffect(() => {
    const el = elRef.current
    if (pendingCaret.current === null || !el) return
    const pos = caretAfterDigit(el.value, pendingCaret.current)
    pendingCaret.current = null
    if (document.activeElement === el) el.setSelectionRange(pos, pos)
  })

  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
    elRef.current = ev.target
    const raw = ev.target.value
    const caret = ev.target.selectionStart ?? raw.length
    const nextDigits = digitsOf(raw)
    pendingCaret.current = digitsOf(raw.slice(0, caret)).length
    onValueChange(
      format(nextDigits, { mask: maskFor(nextDigits), replacement: MASK_REPLACEMENT })
    )
    bump()
  }

  return (
    <input
      {...rest}
      ref={inputRef}
      type='text'
      inputMode='numeric'
      value={shown}
      onChange={handleChange}
    />
  )
}

export const MaskedRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    const maskFor = (digits: string): string =>
      resolveMask(field.maskType, field.mask, digits.length)
    const value = String(field.value ?? '')

    return (
      <MaskedInput
        maskFor={maskFor}
        {...accessibilityAttrs}
        name={field.name}
        value={value}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        inputRef={field.ref}
        autoFocus={field.focus}
        required={field.required}
        disabled={field.readOnly}
        className='flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-md ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
        placeholder={
          field.placeholder ||
          t('form.maskPlaceholder', { mask: maskFor(digitsOf(value)) })
        }
      />
    )
  },
}
