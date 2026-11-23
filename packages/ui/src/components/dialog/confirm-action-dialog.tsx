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
import type { I18nText } from '../../i18n/msg'
import type { ConfirmDialogInput } from '../../types/actions'

export interface ConfirmActionDialogProps {
  /** Controlled open state. Omit it (with a `children` trigger) to let the dialog own it */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Element that opens the dialog on click */
  children?: ReactNode
  /** Default: localized "Confirm action" */
  title?: I18nText
  description?: I18nText
  /** Default: localized "Confirm" */
  confirmText?: I18nText
  /** Default: localized "Cancel" */
  cancelText?: I18nText
  /** `'destructive'` paints the confirm button red */
  variant?: 'default' | 'destructive'
  /** Fields asked before confirming; required ones block the confirm while empty */
  inputs?: ConfirmDialogInput[]
  /**
   * Runs on confirm with the `inputs` values (`{}` without inputs). The dialog
   * stays open, buttons disabled, while it is pending; it closes when it
   * resolves, and stays open showing the error message when it rejects.
   * Resolve `false` to stay open without a message (an error you already
   * reported, e.g. in a toast).
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
 * other button. Optional `inputs` (text, textarea, select) are validated and
 * handed to `onConfirm`; while `onConfirm` is pending the dialog stays open
 * with a spinner, it closes on success and shows the error on failure.
 *
 * @example
 * ```tsx
 * <ConfirmActionDialog
 *   title='Reject request?'
 *   variant='destructive'
 *   inputs={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
 *   onConfirm={({ reason }) => requestsApi.reject(id, reason)}
 * >
 *   <Button variant='destructive'>Reject</Button>
 * </ConfirmActionDialog>
 * ```
 */
export function ConfirmActionDialog({
  open: openProp,
  onOpenChange,
  children,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'default',
  inputs,
  onConfirm,
}: ConfirmActionDialogProps) {
  const t = useTelamonjsT()
  const text = useText()
  const idPrefix = useId()
  const [innerOpen, setInnerOpen] = useState(false)
  const open = openProp ?? innerOpen
  const [values, setValues] = useState(() => initialValues(inputs))
  const [missing, setMissing] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Every opening starts clean (React "adjust state on prop change" pattern)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(inputs))
      setMissing([])
      setError(null)
    }
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
    const empty = (inputs ?? [])
      .filter(i => i.required && !values[i.name]?.trim())
      .map(i => i.name)
    setMissing(empty)
    if (empty.length > 0) return

    setError(null)
    setPending(true)
    try {
      const result = await onConfirm(values)
      setPending(false)
      if (result !== false) setOpen(false)
    } catch (err) {
      setPending(false)
      setError(
        err instanceof Error && err.message
          ? err.message
          : t('toast.unknownError')
      )
    }
  }

  const setValue = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
    if (missing.includes(name)) setMissing(prev => prev.filter(n => n !== name))
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {text(title) || t('dialog.confirmActionTitle')}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{text(description)}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {inputs && inputs.length > 0 && (
          <div className='grid gap-4'>
            {inputs.map(input => {
              const id = `${idPrefix}-${input.name}`
              const errorId = `${id}-error`
              const invalid = missing.includes(input.name)
              const common = {
                id,
                name: input.name,
                required: input.required,
                disabled: pending,
                'aria-invalid': invalid || undefined,
                'aria-describedby': invalid ? errorId : undefined,
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
                      value={values[input.name] ?? ''}
                      onChange={e => setValue(input.name, e.target.value)}
                    />
                  )}
                  {invalid && (
                    <p id={errorId} className='text-sm text-destructive'>
                      {t('validation.required')}
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
            disabled={pending}
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
            {text(confirmText) || t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
