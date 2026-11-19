'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { useTelamonjsT } from '../i18n/use-t'

export interface UseUnsavedChangesGuardReturn {
  /** Update the dirty flag (e.g. wire to `AdminForm`'s `onDirtyChange`). */
  setDirty: (dirty: boolean) => void
  /**
   * Run `action` immediately when clean; when dirty, opens the discard-changes
   * confirmation and only runs `action` if the user confirms.
   */
  guard: (action: () => void) => void
  /** Clear the dirty flag without running any pending action. */
  reset: () => void
  /** The confirmation AlertDialog — render it once, anywhere in the tree. */
  dialog: ReactNode
}

/**
 * useUnsavedChangesGuard - Confirms discarding unsaved changes before an
 * exit action (close dialog, switch section/tab) runs.
 *
 * The dirty flag lives in a `useRef` (not state) so tracking it does not
 * trigger re-renders on every keystroke — only `guard()`'s decision to open
 * the confirmation dialog does.
 *
 * @example
 * ```tsx
 * const guard = useUnsavedChangesGuard()
 *
 * <EditForm onDirtyChange={guard.setDirty} cancelAction={() => guard.guard(handleClose)} ... />
 * {guard.dialog}
 * ```
 *
 * @category Hooks
 */
export function useUnsavedChangesGuard(): UseUnsavedChangesGuardReturn {
  const t = useTelamonjsT()
  const dirtyRef = useRef(false)
  const [open, setOpen] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])

  const reset = useCallback(() => {
    dirtyRef.current = false
  }, [])

  const guard = useCallback((action: () => void) => {
    if (!dirtyRef.current) {
      action()
      return
    }
    pendingActionRef.current = action
    setOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    dirtyRef.current = false
    setOpen(false)
    action?.()
  }, [])

  const handleCancel = useCallback(() => {
    pendingActionRef.current = null
    setOpen(false)
  }, [])

  const dialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('form.unsavedChanges.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('form.unsavedChanges.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {t('form.unsavedChanges.stay')}
          </AlertDialogCancel>
          <AlertDialogAction
            className='bg-red-500 text-white hover:bg-red-600'
            onClick={handleConfirm}
          >
            {t('form.unsavedChanges.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { setDirty, guard, reset, dialog }
}
