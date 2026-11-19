'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '../utils'
import { ModalContext } from './modal-context'

// A mouse (hover-capable, fine pointer) scrolls the list via onWheel below.
const hasMouse = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

// Inside a Dialog/Sheet on touch devices, defaults to `modal` so touch scrolling
// works in the list (see ./modal-context). Not with a mouse: a modal popover sets
// pointer-events: none outside its content, the trigger included, so a
// hover-opened popover (useHoverPopover) saw mouseleave, closed, got the events
// back, reopened — a loop. An explicit `modal` prop always wins.
const Popover = ({ modal, ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
  const inModal = React.useContext(ModalContext)
  return <PopoverPrimitive.Root modal={modal ?? (inModal && !hasMouse())} {...props} />
}

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      onWheel={(e) => e.stopPropagation()}
      className={cn(
        'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
