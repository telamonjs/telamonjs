'use client'

import { Loader2 } from 'lucide-react'
import { useId, useState, type MouseEvent, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { Textarea } from '../../ui/textarea'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { isMessageRef, type I18nText } from '../../i18n/msg'
import type { ConfirmDialogInput, ConfirmDialogOption } from '../../types/actions'

export interface ConfirmActionDialogProps {
  /** Controlled open state. Omit it (with a `children` trigger) to let the dialog own it */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Element that opens the dialog on click (the trigger, never content: see `body`) */
  children?: ReactNode
  /** Text, `msg()` or JSX. Default: localized "Confirm action" */
  title?: I18nText | ReactNode
  /** Text, `msg()` or JSX (phrasing content: it renders inside a `<p>`) */
  description?: I18nText | ReactNode
  /** Free content between the description and the buttons (fields, a summary, a warning) */
  body?: ReactNode
  /** Default: localized "Confirm" */
  confirmText?: I18nText
  /** Confirm label while pending. Default: `confirmText` */
  pendingText?: I18nText
  /** Default: localized "Cancel" */
  cancelText?: I18nText
  /** `'destructive'` paints the confirm button red */
  variant?: 'default' | 'destructive'
  /** Disables only the confirm button, e.g. until a confirmation word is typed */
  confirmDisabled?: boolean
  /**
   * Caller-controlled pending state (usually `mutation.isPending`). Passing it,
   * even `false`, hands the lifecycle to the caller: confirming never closes
   * the dialog; close it yourself (`open`/`onOpenChange`) when the action
   * settles. While `true`, both buttons are disabled, the confirm shows a
   * spinner and `pendingText`, and the dialog cannot be dismissed.
   */
  pending?: boolean
  /**
   * Fields asked before confirming; `required`, `minLength`, `maxLength`,
   * `min`/`max` and `validate` block the confirm while they fail
   */
  inputs?: ConfirmDialogInput[]
  /**
   * Keep the confirm disabled while any input fails, each failing field
   * showing its message live (muted until edited), so the reason is always
   * visible. Default: the confirm stays enabled and messages show from the
   * first attempt (`minLength`/`maxLength` counts show live in both modes).
   */
  disableUntilValid?: boolean
  /**
   * Runs on confirm with the `inputs` values (`{}` without inputs). Without
   * `pending`, the dialog stays open, buttons disabled, while the returned
   * promise is pending; it closes when it resolves, and stays open showing
   * the error message when it rejects. Resolve `false` to stay open without a
   * message (an error you already reported, e.g. in a toast). With `pending`,
   * a rejection still shows its message, but nothing closes the dialog.
   */
  onConfirm: (values: Record<string, string>) => unknown
}

const initialValues = (inputs: ConfirmDialogInput[] = []) =>
  Object.fromEntries(inputs.map(i => [i.name, i.defaultValue ?? '']))

const asOption = (o: string | ConfirmDialogOption): ConfirmDialogOption =>
  typeof o === 'string' ? { value: o, label: o } : o

/**
 * `YYYY-MM-DD` as a Date that renders as that same calendar day. The message
 * formatter applies the app's `timeZone`, not the browser's, so neither UTC
 * midnight (`new Date(iso)`) nor local midnight is safe: one of them shows the
 * day before whenever the two zones differ.
 * ponytail: noon UTC holds for every zone from UTC-11 to UTC+11; format with an
 * explicit `timeZone: 'UTC'` if an app ever runs in UTC+12..+14.
 */
const calendarDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

/**
 * ConfirmActionDialog - confirmation for an action, async aware.
 *
 * @category Dialogs
 * @status stable
 *
 * @description
 * The dialog behind `confirmDialog` on row and menu actions, public for any
 * other button. Optional `inputs` (text, textarea, select, date) are validated
 * (`required`, `minLength`/`maxLength`, `min`/`max`, `validate`) and handed to
 * `onConfirm`; `disableUntilValid` keeps the confirm off until they pass; `body` adds free
 * content. Two pending modes: by default the dialog awaits `onConfirm`
 * (spinner, closes on success, shows the error on failure); with a `pending`
 * prop the caller runs the action and closes the dialog itself.
 *
 * @example
 * ```tsx
 * // The dialog awaits the action
 * <ConfirmActionDialog
 *   title='Reject request?'
 *   variant='destructive'
 *   inputs={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
 *   onConfirm={({ reason }) => requestsApi.reject(id, reason)}
 * >
 *   <Button variant='destructive'>Reject</Button>
 * </ConfirmActionDialog>
 *
 * // The caller runs a mutation and closes on success
 * <ConfirmActionDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title={<>Publish <strong>{name}</strong>?</>}
 *   pending={publish.isPending}
 *   pendingText='Publishing...'
 *   onConfirm={() => publish.mutate(undefined, { onSuccess: () => setOpen(false) })}
 * />
 * ```
 */
export function ConfirmActionDialog({
  open: openProp,
  onOpenChange,
  children,
  title,
  description,
  body,
  confirmText,
  pendingText,
  cancelText,
  variant = 'default',
  confirmDisabled = false,
  pending: pendingProp,
  inputs,
  disableUntilValid = false,
  onConfirm,
}: ConfirmActionDialogProps) {
  const t = useTelamonjsT()
  const text = useText()
  const idPrefix = useId()
  const [innerOpen, setInnerOpen] = useState(false)
  const open = openProp ?? innerOpen
  const [values, setValues] = useState(() => initialValues(inputs))
  // Field errors show from the first confirm attempt on, recomputed live
  const [attempted, setAttempted] = useState(false)
  // Edited fields: with `disableUntilValid` their messages turn from hint to error
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [innerPending, setInnerPending] = useState(false)
  const callerOwnsPending = pendingProp !== undefined
  const pending = pendingProp ?? innerPending

  // Every opening starts clean (React "adjust state on prop change" pattern)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(inputs))
      setAttempted(false)
      setTouched({})
      setError(null)
    }
  }

  const node = (value: I18nText | ReactNode): ReactNode =>
    isMessageRef(value) ? text(value) : value

  /** The live count of a `minLength`/`maxLength` field (trimmed value), if it fails */
  const lengthMessage = (input: ConfirmDialogInput): string | undefined => {
    const length = (values[input.name] ?? '').trim().length
    if (input.minLength && length < input.minLength && (length > 0 || input.required))
      return t('validation.charactersMissing', { count: input.minLength - length })
    if (input.maxLength && length > input.maxLength)
      return t('validation.charactersOver', { count: length - input.maxLength })
    return undefined
  }

  const fieldError = (input: ConfirmDialogInput): I18nText | undefined => {
    const value = values[input.name] ?? ''
    const length = lengthMessage(input)
    if (length) return length
    if (input.required && !value.trim()) return t('validation.required')
    if (input.type === 'date' && value) {
      if (input.min && value < input.min)
        return t('validation.tooSmallDate', { min: calendarDate(input.min) })
      if (input.max && value > input.max)
        return t('validation.tooBigDate', { max: calendarDate(input.max) })
    }
    return input.validate?.(value, values)
  }
  const invalid = (inputs ?? []).some(input => fieldError(input))

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }

  const handleOpenChange = (next: boolean) => {
    // A pending action cannot be dismissed (ESC, overlay, Cancel)
    if (!next && pending) return
    setOpen(next)
  }

  const handleConfirm = async (event: MouseEvent) => {
    // AlertDialogAction closes on click; this dialog closes only on success
    event.preventDefault()
    setAttempted(true)
    if (invalid) return

    setError(null)
    if (!callerOwnsPending) setInnerPending(true)
    try {
      const result = await onConfirm(values)
      if (callerOwnsPending) return
      setInnerPending(false)
      if (result !== false) setOpen(false)
    } catch (err) {
      if (!callerOwnsPending) setInnerPending(false)
      setError(
        err instanceof Error && err.message
          ? err.message
          : t('toast.unknownError')
      )
    }
  }

  const setValue = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
    setTouched(prev => (prev[name] ? prev : { ...prev, [name]: true }))
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent
        // With inputs the first field gets focus, so the reason can be typed
        // right away; without them focus stays on Cancel (Radix default), the
        // safe default for a destructive confirmation.
        onOpenAutoFocus={event => {
          const first = inputs?.[0]
          if (!first) return
          const field = document.getElementById(`${idPrefix}-${first.name}`)
          if (!field) return
          event.preventDefault()
          field.focus()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {node(title) || t('dialog.confirmActionTitle')}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{node(description)}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {body}

        {inputs && inputs.length > 0 && (
          <div className='grid gap-4'>
            {inputs.map(input => {
              const id = `${idPrefix}-${input.name}`
              const errorId = `${id}-error`
              const helpId = `${id}-help`
              const listId = `${id}-suggestions`
              const message = fieldError(input)
              // Error (red, aria-invalid) after an attempt, or once edited with
              // `disableUntilValid`; before that a muted hint, shown live for
              // length counts and for every failing field with `disableUntilValid`
              const asError =
                !!message && (attempted || (disableUntilValid && !!touched[input.name]))
              const shown =
                asError || (!!message && (disableUntilValid || !!lengthMessage(input)))
              const describedBy =
                [input.description && helpId, shown && errorId].filter(Boolean).join(' ') ||
                undefined
              const placeholder = text(input.placeholder)
              const common = {
                id,
                name: input.name,
                required: input.required,
                disabled: pending,
                placeholder,
                inputMode: input.inputMode,
                autoComplete: input.autoComplete,
                'aria-invalid': asError ? true : undefined,
                'aria-describedby': describedBy,
              }
              return (
                <div key={input.name} className='grid gap-1.5'>
                  <Label htmlFor={id}>
                    {text(input.label)}
                    {input.required && (
                      <span aria-hidden='true' className='text-destructive'>
                        {' *'}
                      </span>
                    )}
                  </Label>
                  {input.type === 'textarea' ? (
                    <Textarea
                      {...common}
                      rows={input.rows}
                      value={values[input.name] ?? ''}
                      onChange={e => setValue(input.name, e.target.value)}
                    />
                  ) : input.type === 'select' ? (
                    <Select
                      value={values[input.name] ?? ''}
                      onValueChange={v => setValue(input.name, v)}
                      disabled={pending}
                    >
                      <SelectTrigger
                        id={id}
                        aria-invalid={common['aria-invalid']}
                        aria-describedby={describedBy}
                      >
                        <SelectValue placeholder={placeholder || t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(input.options ?? []).map(asOption).map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {text(option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : input.type === 'date' ? (
                    <Input
                      {...common}
                      type='date'
                      min={input.min}
                      max={input.max}
                      value={values[input.name] ?? ''}
                      onChange={e => setValue(input.name, e.target.value)}
                    />
                  ) : (
                    <>
                      <Input
                        {...common}
                        type='text'
                        list={input.suggestions?.length ? listId : undefined}
                        value={values[input.name] ?? ''}
                        onChange={e => setValue(input.name, e.target.value)}
                      />
                      {input.suggestions?.length ? (
                        <datalist id={listId}>
                          {input.suggestions.map(s => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      ) : null}
                    </>
                  )}
                  {input.description && (
                    <p id={helpId} className='text-xs text-muted-foreground'>
                      {text(input.description)}
                    </p>
                  )}
                  {shown && message && (
                    <p
                      id={errorId}
                      data-state={asError ? 'error' : 'hint'}
                      className={
                        asError ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'
                      }
                    >
                      {text(message)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <p
            role='alert'
            data-testid='confirm-action-error'
            className='text-sm text-destructive'
          >
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel data-testid='modal-cancel' disabled={pending}>
            {text(cancelText) || t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid='modal-confirm'
            disabled={pending || confirmDisabled || (disableUntilValid && invalid)}
            aria-busy={pending || undefined}
            className={
              variant === 'destructive'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : ''
            }
            onClick={handleConfirm}
          >
            {pending && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden='true' />
            )}
            {(pending && text(pendingText)) ||
              text(confirmText) ||
              t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
