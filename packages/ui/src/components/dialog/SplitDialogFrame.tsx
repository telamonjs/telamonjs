'use client'

import * as React from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetFooter,
} from '../../ui/sheet'
import { cn } from '../../utils'
import { DialogSize, DIALOG_SIZES, resolveDialogSize } from '../../utils/spacing'

export interface SplitDialogFrameProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void
  /** Dialog title (used for accessibility, sr-only when renderHeader is provided) */
  title: string
  /**
   * Dialog size preset.
   * @default 'full'
   */
  size?: DialogSize
  /**
   * Fixed height for the dialog.
   * @default 'h-[min(750px,85vh)]'
   */
  height?: string
  /** Force desktop mode (Dialog) even on mobile */
  forceDesktopMode?: boolean
  /** Custom header renderer (replaces default title) */
  renderHeader?: () => React.ReactNode
  /** Left panel content (form, settings, etc.) */
  sidePanel: React.ReactNode
  /**
   * Width of the side panel.
   * @default 'w-[420px]'
   */
  sidePanelWidth?: string
  /** Main panel content (map, preview, etc.) */
  children: React.ReactNode
  /** Hint text displayed at the bottom of the main panel */
  mainPanelHint?: string
  /** Footer content (buttons) */
  footer?: React.ReactNode
  /** Optional className for the dialog */
  className?: string
}

/**
 * SplitDialogFrame - Dialog with side-by-side layout
 *
 * Provides a wide dialog with two panels: a fixed-width side panel (form/settings)
 * and a flexible main panel (map, preview, rich content). Includes consistent
 * header and footer styling from the telamonjs design system.
 *
 * On mobile, falls back to a stacked layout in a Sheet.
 *
 * @example
 * ```tsx
 * <SplitDialogFrame
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Criar Nova Cerca"
 *   renderHeader={() => (
 *     <DialogHeaderContent item={null} config={headerConfig} mode="create" />
 *   )}
 *   sidePanel={<MyForm />}
 *   mainPanelHint="Clique no mapa para posicionar"
 *   footer={
 *     <>
 *       <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
 *       <Button type="submit">Criar</Button>
 *     </>
 *   }
 * >
 *   <GoogleMap ... />
 * </SplitDialogFrame>
 * ```
 */
export function SplitDialogFrame({
  open,
  onOpenChange,
  title,
  size = 'full',
  height = 'h-[min(750px,85vh)]',
  forceDesktopMode = false,
  renderHeader,
  sidePanel,
  sidePanelWidth = 'w-[420px]',
  children,
  mainPanelHint,
  footer,
  className,
}: SplitDialogFrameProps) {
  const isMobileDetected = useIsMobile()
  const isMobile = isMobileDetected && !forceDesktopMode

  // Mobile: stacked layout in Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] px-0 flex flex-col" aria-describedby={undefined}>
          {renderHeader ? (
            <>
              {/* Same as DialogFrame: accessible title even with a custom header */}
              <SheetTitle className="sr-only">{title}</SheetTitle>
              {renderHeader()}
            </>
          ) : (
            <div className="px-6 py-4 border-b">
              <SheetTitle>{title}</SheetTitle>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4 border-b">{sidePanel}</div>
            <div className="h-[300px]">{children}</div>
            {mainPanelHint && (
              <div className="px-4 py-2.5 bg-muted/50 border-t text-sm text-muted-foreground text-center">
                {mainPanelHint}
              </div>
            )}
          </div>
          {footer && (
            <SheetFooter className="border-t bg-muted/50 px-6 py-4">
              {footer}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: side-by-side layout
  const sizeClass = `w-[90vw] ${DIALOG_SIZES[resolveDialogSize(size)]}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          '!p-0 !gap-0 flex flex-col',
          height,
          sizeClass,
          className
        )}
      >
        {/* Header */}
        {renderHeader ? (
          <>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <div className="shrink-0">{renderHeader()}</div>
          </>
        ) : (
          <div className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
        )}

        {/* Body: side-by-side panels */}
        <div className="flex flex-1 min-h-0">
          {/* Side panel */}
          <div
            className={cn(
              'shrink-0 border-r overflow-y-auto',
              sidePanelWidth
            )}
          >
            {sidePanel}
          </div>

          {/* Main panel */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 relative">{children}</div>
            {mainPanelHint && (
              <div className="px-4 py-2.5 bg-muted/50 border-t text-sm text-muted-foreground text-center shrink-0">
                {mainPanelHint}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <DialogFooter className="border-t bg-muted/50 px-6 py-4 shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
