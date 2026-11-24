'use client'

import * as React from 'react'

import { useIsMobile } from '../../hooks/use-mobile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet'
import { cn } from '../../utils'
import { DialogLoadingState } from './DialogLoadingState'
import { QueryErrorState } from '../utilities/QueryErrorState'

/**
 * Desktop loading/error status configuration.
 * When provided, the desktop branch renders a centered status dialog
 * (loading spinner / error alert) instead of the main content.
 */
export interface CrudDialogDesktopStatus {
  /** Size class applied to the status DialogContent (from getDialogClassName) */
  sizeClass: string
  /** Whether data is loading */
  isLoading: boolean
  /** Error message, if any */
  error: string | null
  /** "Try again" on the error state */
  onRetry?: () => void
}

/**
 * Props for the internal CrudDialogShell component.
 *
 * All classNames are passed pre-computed by the caller so each dialog
 * (Create/Edit/View) keeps its exact historical styling.
 */
export interface CrudDialogShellProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void
  /**
   * Resolved title string. Rendered visibly in the default header,
   * or as an sr-only title when a custom header is used.
   */
  title: string
  /**
   * Resolved description. Rendered below the title in the default header, or as
   * an sr-only description (still wired to aria-describedby) with a custom header.
   */
  description?: string
  /**
   * Pre-rendered custom header node (renderHeader / headerConfig already
   * resolved by the caller). `undefined` means "no custom header" and the
   * default header is rendered. `null` still counts as a custom header
   * (matches legacy `Boolean(renderHeader)` semantics).
   */
  customHeader?: React.ReactNode
  /** Force desktop Dialog even on mobile (ViewDialog only) */
  forceDesktopMode?: boolean

  // --- Mobile (Sheet) configuration ---
  /** SheetContent className (side is always 'bottom') */
  sheetContentClassName: string
  /** className of the body wrapper inside the Sheet */
  sheetBodyClassName: string
  /** className for the default SheetHeader (when no custom header) */
  sheetHeaderClassName?: string
  /** className for the default SheetTitle (when no custom header) */
  sheetTitleClassName?: string
  /** Render an sr-only SheetTitle alongside the custom header (EditDialog) */
  sheetSrOnlyTitle?: boolean

  // --- Desktop (Dialog) configuration ---
  /** DialogContent className (from getDialogClassName / caller-computed) */
  dialogContentClassName: string
  /** className of the body wrapper inside the Dialog */
  dialogBodyClassName: string
  /** className for the default DialogHeader (when no custom header) */
  dialogHeaderClassName?: string
  /** Wrap the desktop custom header in a flex-shrink-0 div (Create/Edit) */
  wrapDesktopCustomHeader?: boolean
  /**
   * When set, desktop renders a centered loading/error dialog instead of
   * the main content (Edit/View while fetching). Mobile ignores this and
   * renders children (which handle their own loading/error states).
   */
  desktopStatus?: CrudDialogDesktopStatus

  /** Optional footer, rendered after the body in both modes (ViewDialog) */
  footer?: React.ReactNode
  /** Dialog body content */
  children: React.ReactNode
}

/**
 * CrudDialogShell - Internal shared frame for CreateDialog/EditDialog/ViewDialog.
 *
 * Consolidates the structure previously duplicated across the three CRUD
 * dialogs:
 * - Mobile Sheet (bottom) vs desktop Dialog branching via useIsMobile
 * - Header precedence: custom header (with a11y sr-only title) > default header
 * - Desktop centered loading/error status dialog
 * - Body wrapper + optional footer
 *
 * NOT part of the public API - do not export from src/index.ts.
 *
 * @internal
 */
export function CrudDialogShell({
  open,
  onOpenChange,
  title,
  description,
  customHeader,
  forceDesktopMode = false,
  sheetContentClassName,
  sheetBodyClassName,
  sheetHeaderClassName,
  sheetTitleClassName,
  sheetSrOnlyTitle = false,
  dialogContentClassName,
  dialogBodyClassName,
  dialogHeaderClassName,
  wrapDesktopCustomHeader = false,
  desktopStatus,
  footer,
  children,
}: CrudDialogShellProps) {
  const isMobileDetected = useIsMobile()
  const isMobile = isMobileDetected && !forceDesktopMode

  const hasCustomHeader = customHeader !== undefined

  // Mobile: Use Sheet (bottom panel)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side='bottom' className={sheetContentClassName}>
          {hasCustomHeader ? (
            <>
              {sheetSrOnlyTitle && (
                <SheetTitle className='sr-only'>{title}</SheetTitle>
              )}
              {description && (
                <SheetDescription className='sr-only'>
                  {description}
                </SheetDescription>
              )}
              {customHeader}
            </>
          ) : (
            <SheetHeader className={sheetHeaderClassName}>
              <SheetTitle className={sheetTitleClassName}>{title}</SheetTitle>
              {description && (
                <SheetDescription>{description}</SheetDescription>
              )}
            </SheetHeader>
          )}
          <div className={sheetBodyClassName}>{children}</div>
          {footer}
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: loading/error status dialog (clean centered card)
  // Only while open: swapping the DialogContent tree during the exit animation
  // (data is reset ~200ms after close) races the Radix Presence unmount.
  if (desktopStatus && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'flex flex-col items-center justify-center',
            desktopStatus.sizeClass
          )}
        >
          <DialogTitle className='sr-only'>{title}</DialogTitle>
          {desktopStatus.isLoading && <DialogLoadingState />}
          {desktopStatus.error && (
            <div className='py-8 w-full px-6'>
              <QueryErrorState
                error={desktopStatus.error}
                onRetry={desktopStatus.onRetry}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  // Desktop: Use Dialog (centered modal)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentClassName}>
        {hasCustomHeader ? (
          <>
            <DialogTitle className='sr-only'>{title}</DialogTitle>
            {description && (
              <DialogDescription className='sr-only'>
                {description}
              </DialogDescription>
            )}
            {wrapDesktopCustomHeader ? (
              <div className='flex-shrink-0'>{customHeader}</div>
            ) : (
              customHeader
            )}
          </>
        ) : (
          <DialogHeader className={dialogHeaderClassName}>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription className='text-sm text-muted-foreground'>
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        <div className={dialogBodyClassName}>{children}</div>
        {footer}
      </DialogContent>
    </Dialog>
  )
}
