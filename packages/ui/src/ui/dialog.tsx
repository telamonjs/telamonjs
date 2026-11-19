'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '../utils'
import { useTelamonjsT } from '../i18n/use-t'
import { ModalContext } from './modal-context'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

/**
 * Lets `DialogDescription` tell its `DialogContent` it exists. Without a
 * description, Radix warns "Missing Description … for DialogContent" because the
 * content points `aria-describedby` at an id nobody renders — so the content
 * drops the attribute until a description mounts (then Radix's id applies).
 */
const DescriptionPresence = React.createContext<((present: boolean) => void) | null>(null)

/**
 * Same idea for `DialogTitle`: the sr-only fallback title is only injected when
 * no title is rendered anywhere inside the content. A nested title (e.g. inside
 * `DialogHeader`) used to get the fallback too — both carry Radix's title id, and
 * the fallback ("Dialog"), first in the DOM, became the accessible name.
 */
const TitlePresence = React.createContext<((present: boolean) => void) | null>(null)

function usePresenceAnnouncer(ctx: React.Context<((present: boolean) => void) | null>) {
  const announce = React.useContext(ctx)
  React.useLayoutEffect(() => {
    announce?.(true)
    return () => announce?.(false)
  }, [announce])
}

/** Default width when the caller sets none (`w-*`/`max-w-*`), like shadcn's `max-w-lg`. */
const HAS_WIDTH = /(^|[\s:])!?(max-w-|w-)/

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const t = useTelamonjsT()
  const [hasDescription, setHasDescription] = React.useState(false)
  const [hasNestedTitle, setHasNestedTitle] = React.useState(false)
  // Check if children already includes a DialogTitle to avoid Radix a11y warning
  const hasDirectTitle = React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false
    return (
      (child.type as { displayName?: string })?.displayName ===
      DialogPrimitive.Title.displayName
    )
  })
  const hasTitle = hasDirectTitle || hasNestedTitle
  // An explicit `aria-describedby` from the caller always wins.
  const describedBy =
    'aria-describedby' in props || hasDescription ? {} : { 'aria-describedby': undefined }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2 sm:rounded-lg',
          !HAS_WIDTH.test(className ?? '') && 'max-w-lg',
          className
        )}
        {...describedBy}
        {...props}
      >
        <TitlePresence.Provider value={setHasNestedTitle}>
          <DescriptionPresence.Provider value={setHasDescription}>
            {!hasTitle && (
              <DialogPrimitive.Title className="sr-only">{t('dialog.defaultTitle')}</DialogPrimitive.Title>
            )}
            <ModalContext.Provider value>{children}</ModalContext.Provider>
          </DescriptionPresence.Provider>
        </TitlePresence.Provider>
        <DialogPrimitive.Close className='absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'>
          <X className='h-4 w-4' />
          <span className='sr-only'>{t('common.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  usePresenceAnnouncer(TitlePresence)
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  usePresenceAnnouncer(DescriptionPresence)
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
})
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
