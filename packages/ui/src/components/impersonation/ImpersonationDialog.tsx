'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Check, Loader2, Search } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { useDebounce } from '../../hooks/use-debounce'
import { useTelamonjsT } from '../../i18n/use-t'
import { cn } from '../../utils'

export interface ImpersonationUserOption {
  /** Identifier sent to `onConfirm`. */
  id: string
  /** Main label (user name). */
  label: string
  /** Optional secondary line (email, role, company...). */
  description?: string
  /** Prevents selecting this user. */
  disabled?: boolean
}

export interface ImpersonationConfirmResult {
  ok: boolean
  /** Error message shown in the dialog when `ok` is `false`. */
  message?: string
}

export interface ImpersonationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Searches for candidate users. Called with the already-debounced term
   * (and with an empty string on open, for the initial listing). Rejections
   * become an error state in the dialog — no need to handle it outside.
   */
  searchUsers: (term: string) => Promise<ImpersonationUserOption[]>
  /**
   * Triggers the impersonation. `{ ok: true }` closes the dialog; `{ ok: false }`
   * keeps it open and shows `message`.
   */
  onConfirm: (userId: string) => Promise<ImpersonationConfirmResult>
  title?: string
  description?: string
  searchPlaceholder?: string
  emptyMessage?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Search debounce delay, in ms. */
  debounceMs?: number
  className?: string
}

/**
 * ImpersonationDialog — generic user picker to start an impersonation.
 *
 * Each consumer app kept an almost identical copy of this dialog (debounced
 * search → list → confirm); the only thing that varied was where the users
 * came from and which action was triggered. Both are injected (`searchUsers`,
 * `onConfirm`), so the component has no knowledge of any app's API,
 * react-query, or server action.
 *
 * The list is built from native `<button>`s with `aria-pressed` instead of
 * `Command` (cmdk): filtering here is server-side (`shouldFilter={false}` in
 * every app copy), so cmdk would only add weight without delivering anything.
 *
 * @example
 * ```tsx
 * <ImpersonationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   searchUsers={async term => (await api.listUsers({ search: term })).map(toOption)}
 *   onConfirm={async id => {
 *     const r = await impersonateUser(id)
 *     return { ok: r.success, message: r.message }
 *   }}
 * />
 * ```
 */
export function ImpersonationDialog({
  open,
  onOpenChange,
  searchUsers,
  onConfirm,
  title,
  description,
  searchPlaceholder,
  emptyMessage,
  confirmLabel,
  cancelLabel,
  debounceMs = 300,
  className,
}: ImpersonationDialogProps) {
  const t = useTelamonjsT()
  const resolvedTitle = title ?? t('impersonation.title')
  const resolvedDescription = description ?? t('impersonation.description')
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? t('impersonation.searchPlaceholder')
  const resolvedEmptyMessage = emptyMessage ?? t('impersonation.emptyMessage')
  const resolvedConfirmLabel = confirmLabel ?? t('impersonation.confirmLabel')
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel')
  const searchInputId = useId()
  const [term, setTerm] = useState('')
  const [options, setOptions] = useState<ImpersonationUserOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const debouncedTerm = useDebounce(term, debounceMs)

  // Callbacks are kept in a ref: consumers pass an inline arrow, and an
  // unstable dependency in the effect below would turn into an infinite
  // search loop. Synced in an effect (not during render) so the refs stay
  // read-only during render, per the rules of React.
  const searchUsersRef = useRef(searchUsers)
  const onConfirmRef = useRef(onConfirm)
  useEffect(() => {
    searchUsersRef.current = searchUsers
    onConfirmRef.current = onConfirm
  })

  // Reset on close — the dialog shouldn't reopen with a stale selection/error
  // (React "adjusting state when a prop changes" pattern — avoids an effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setTerm('')
      setOptions([])
      setSelectedId(null)
      setSearchError(null)
      setConfirmError(null)
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function search() {
      setIsSearching(true)
      setSearchError(null)
      try {
        const result = await searchUsersRef.current(debouncedTerm)
        if (cancelled) return
        setOptions(result ?? [])
      } catch {
        if (cancelled) return
        setOptions([])
        setSearchError(t('impersonation.searchError'))
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }
    search()

    return () => {
      cancelled = true
    }
  }, [open, debouncedTerm, t])

  const handleConfirm = useCallback(async () => {
    if (!selectedId || isConfirming) return

    setIsConfirming(true)
    setConfirmError(null)
    try {
      const result = await onConfirmRef.current(selectedId)
      if (result?.ok) {
        onOpenChange(false)
        return
      }
      setConfirmError(result?.message || t('impersonation.confirmError'))
    } catch (error) {
      setConfirmError(
        error instanceof Error ? error.message : t('impersonation.confirmError')
      )
    } finally {
      setIsConfirming(false)
    }
  }, [selectedId, isConfirming, onOpenChange, t])

  const showEmpty = !isSearching && !searchError && options.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-[520px]', className)}>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <div className='space-y-2'>
          <Label htmlFor={searchInputId}>{t('impersonation.userLabel')}</Label>
          <div className='relative'>
            <Search
              aria-hidden='true'
              className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
            />
            <Input
              id={searchInputId}
              type='search'
              className='pl-9'
              placeholder={resolvedSearchPlaceholder}
              value={term}
              onChange={event => setTerm(event.target.value)}
              disabled={isConfirming}
            />
          </div>

          <div className='max-h-[300px] overflow-y-auto rounded-md border'>
            {isSearching && (
              <p
                role='status'
                className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'
              >
                <Loader2 aria-hidden='true' className='h-4 w-4 animate-spin' />
                {t('impersonation.searching')}
              </p>
            )}

            {searchError && (
              <p
                role='alert'
                className='py-6 text-center text-sm text-destructive'
              >
                {searchError}
              </p>
            )}

            {showEmpty && (
              <p
                role='status'
                className='py-6 text-center text-sm text-muted-foreground'
              >
                {resolvedEmptyMessage}
              </p>
            )}

            {!isSearching && !searchError && options.length > 0 && (
              <ul className='p-1'>
                {options.map(option => {
                  const isSelected = option.id === selectedId
                  return (
                    <li key={option.id}>
                      <button
                        type='button'
                        data-testid={`impersonation-option-${option.id}`}
                        aria-pressed={isSelected}
                        disabled={option.disabled || isConfirming}
                        onClick={() => setSelectedId(option.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'disabled:pointer-events-none disabled:opacity-50',
                          isSelected && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <Check
                          aria-hidden='true'
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate font-medium'>
                            {option.label}
                          </span>
                          {option.description && (
                            <span className='block truncate text-xs text-muted-foreground'>
                              {option.description}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {confirmError && (
            <p role='alert' className='text-sm text-destructive'>
              {confirmError}
            </p>
          )}
        </div>

        <div className='flex justify-end gap-3 border-t pt-4'>
          <Button
            type='button'
            variant='outline'
            data-testid='impersonation-dialog-cancel'
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {resolvedCancelLabel}
          </Button>
          <Button
            type='button'
            data-testid='impersonation-dialog-confirm'
            onClick={handleConfirm}
            disabled={!selectedId || isConfirming}
          >
            {isConfirming && (
              <Loader2
                aria-hidden='true'
                className='mr-2 h-4 w-4 animate-spin'
              />
            )}
            {isConfirming ? t('impersonation.confirming') : resolvedConfirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
