'use client'

import * as React from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '../../ui/sheet'
import { cn } from '../../utils'
import { DialogSize, DIALOG_SIZES, resolveDialogSize } from '../../utils/spacing'

export interface DialogFrameProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /**
   * Dialog size preset.
   * - 'sm': max-w-md
   * - 'md': max-w-2xl
   * - 'lg': max-w-4xl
   * - 'xl': max-w-6xl
   * - 'full': max-w-[95vw] (default)
   *
   * @default 'full'
   */
  size?: DialogSize
  /** Force desktop mode (Dialog) even on mobile - useful for wide content */
  forceDesktopMode?: boolean
  /** Optional custom className for the dialog content */
  className?: string
  /** Dialog content */
  children: React.ReactNode
  /** Optional footer content */
  footer?: React.ReactNode
  /** Optional custom header renderer */
  renderHeader?: () => React.ReactNode
}

/**
 * DialogFrame - Encapsulates mobile/desktop detection and rendering logic
 *
 * Automatically renders as Dialog on desktop, Sheet on mobile for optimal UX.
 * Eliminates duplicated useIsMobile and conditional rendering logic across dialogs.
 *
 * @example
 * ```tsx
 * <DialogFrame
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="User Details"
 *   size="lg"
 *   footer={<Button onClick={handleSave}>Save</Button>}
 * >
 *   <div>Content here</div>
 * </DialogFrame>
 * ```
 */
export function DialogFrame({
  open,
  onOpenChange,
  title,
  size = 'full',
  forceDesktopMode = false,
  className,
  children,
  footer,
  renderHeader,
}: DialogFrameProps) {
  const isMobileDetected = useIsMobile()
  const isMobile = isMobileDetected && !forceDesktopMode

  // Mobile: Use Sheet (bottom panel)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {/* No description in sheet mode: tell Radix explicitly (a11y warning otherwise) */}
        <SheetContent side='bottom' className='h-[90vh] px-6 flex flex-col' aria-describedby={undefined}>
          {renderHeader ? (
            <>
              {/* Keep an accessible title in sheet mode too, so custom headers
                  don't need their own DialogTitle (which duplicates the id on desktop) */}
              <SheetTitle className='sr-only'>{title}</SheetTitle>
              {renderHeader()}
            </>
          ) : (
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
          )}
          <div className='flex-1 mt-6 overflow-y-auto'>{children}</div>
          {footer && <SheetFooter className='mt-6'>{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Use Dialog (centered modal)
  const sizeClass = `w-[90vw] ${DIALOG_SIZES[resolveDialogSize(size)]}`
  const hasCustomHeader = Boolean(renderHeader)

  const finalDialogClassName = cn(
    'flex flex-col max-h-[90vh]',
    hasCustomHeader ? '!p-0 !gap-0' : 'px-6',
    sizeClass,
    className
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={finalDialogClassName}>
        {hasCustomHeader ? (
          <>
            <DialogTitle className='sr-only'>{title}</DialogTitle>
            {renderHeader?.()}
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className={cn('flex-1 overflow-y-auto flex flex-col', !hasCustomHeader && 'mt-4')}>
          {children}
        </div>
        {footer && (
          <DialogFooter
            className={cn(
              'border-t bg-muted/50 px-6 py-4',
              !hasCustomHeader && '-mx-6 -mb-6'
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
