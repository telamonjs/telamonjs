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
import type { ConfirmDialogInput } from '../../types/actions'

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
   * Fields asked before confirming; `required` and `validate` block the
   * confirm while they fail
   */
  inputs?: ConfirmDialogInput[]
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

/**
 * ConfirmActionDialog - confirmation for an action, async aware.
 *
 * @category Dialogs
 * @status stable
 *
 * @description
 * The dialog behind `confirmDialog` on row and menu actions, public for any
 * other button. Optional `inputs` (text, textarea, select, date) are validated
 * (`required`, `validate`) and handed to `onConfirm`; `body` adds free
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
      setError(null)
    }
  }

  const node = (value: I18nText | ReactNode): ReactNode =>
    isMessageRef(value) ? text(value) : value

  const fieldError = (input: ConfirmDialogInput): I18nText | undefined => {
    const value = values[input.name] ?? ''
    if (input.required && !value.trim()) return t('validation.required')
    return input.validate?.(value, values)
  }

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
    if ((inputs ?? []).some(input => fieldError(input))) return

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

  const setValue = (name: string, value: string) =>
    setValues(prev => ({ ...prev, [name]: value }))

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
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
              const message = attempted ? fieldError(input) : undefined
              const common = {
                id,
                name: input.name,
                required: input.required,
                disabled: pending,
                'aria-invalid': message ? true : undefined,
                'aria-describedby': message ? errorId : undefined,
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
                        aria-describedby={common['aria-describedby']}
                      >
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(input.options ?? []).map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      {...common}
                      type={input.type === 'date' ? 'date' : 'text'}
                      value={values[input.name] ?? ''}
                      onChange={e => setValue(input.name, e.target.value)}
                    />
                  )}
                  {message && (
                    <p id={errorId} className='text-sm text-destructive'>
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
            disabled={pending || confirmDisabled}
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
