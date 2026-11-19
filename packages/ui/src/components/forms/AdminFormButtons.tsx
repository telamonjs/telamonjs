'use client'

import { memo } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from '../../ui/button'
import { TEST_IDS } from '../../utils/test-ids'
import { useTelamonjsT } from '../../i18n/use-t'

/**
 * AdminFormButtons Props
 *
 * @category Forms
 */
export interface AdminFormButtonsProps {
  /** Whether form submission is pending */
  isPending: boolean
  /** Whether form is valid (passed validation) */
  isValid?: boolean
  /** Whether form has unsaved changes */
  isDirty?: boolean
  /** Form mode (create or edit) */
  mode?: 'create' | 'edit'
  /** Submit button label. Default: 'Salvar' */
  submitLabel?: string
  /** Cancel button label. Default: 'Cancelar' */
  cancelLabel?: string
  /** Cancel button click handler */
  onCancel?: () => void
  /** Hide buttons completely */
  hide?: boolean
}

/**
 * AdminFormButtons - Standardized form action buttons (Submit + Cancel)
 *
 * @category Forms
 * @status stable
 *
 * @description
 * Memoized component that renders submit and cancel buttons with consistent
 * styling, loading states, and accessibility attributes.
 *
 * **Features:**
 * - Loading states with spinner
 * - Accessibility (ARIA labels, busy state)
 * - Test IDs for E2E testing
 * - Default cancel behavior (window.history.back)
 * - Customizable labels
 * - Consistent styling
 *
 * @example
 * Basic usage:
 * ```tsx
 * <AdminFormButtons
 *   isPending={isPending}
 *   onCancel={() => router.push('/users')}
 * />
 * ```
 *
 * @example
 * With custom labels:
 * ```tsx
 * <AdminFormButtons
 *   isPending={isPending}
 *   submitLabel="Create User"
 *   cancelLabel="Go Back"
 *   mode="create"
 * />
 * ```
 */
export const AdminFormButtons = memo(function AdminFormButtons({
  isPending,
  submitLabel,
  cancelLabel,
  onCancel,
  hide = false,
}: AdminFormButtonsProps) {
  const t = useTelamonjsT()

  if (hide) return null

  const handleCancel = onCancel || (() => window.history.back())
  const resolvedSubmitLabel = submitLabel || t('common.save')
  const resolvedCancelLabel = cancelLabel || t('common.cancel')

  return (
    <div className='flex justify-end space-x-3'>
      <Button
        type='button'
        variant='outline'
        onClick={handleCancel}
        disabled={isPending}
        className='h-10 px-6 gap-2'
        data-testid={TEST_IDS.FORM.CANCEL}
        aria-label={t('form.cancelForm')}
      >
        <X className='h-4 w-4' />
        {resolvedCancelLabel}
      </Button>

      <Button
        type='submit'
        disabled={isPending}
        loading={isPending}
        className='h-10 px-6 gap-2'
        data-testid={TEST_IDS.FORM.SUBMIT}
        aria-label={isPending ? t('form.savingForm') : t('form.saveForm')}
        aria-busy={isPending}
      >
        {isPending ? (
          t('common.saving')
        ) : (
          <>
            <Save className='h-4 w-4' />
            {resolvedSubmitLabel}
          </>
        )}
      </Button>
    </div>
  )
})
