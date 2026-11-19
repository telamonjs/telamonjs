import { useState, useCallback, useEffect, useRef } from 'react'

const CLOSE_DELAY = 300
/** Window in which a pointerdown on the trigger counts as the click behind onOpenChange */
const CLICK_WINDOW_MS = 1000

interface UseHoverPopoverOptions {
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
  /** Checked when the close delay ends: true cancels the close (Esc and outside clicks still work). */
  keepOpen?: () => boolean
}

/**
 * Open on hover, close shortly after the pointer leaves trigger and content.
 * Works with Popover and DropdownMenu (spread `triggerProps` on the Trigger,
 * `contentProps` on the Content and any SubContent).
 *
 * The click that naturally follows the hover used to reach Radix as a toggle
 * and close what the hover had just opened ("opens every other click"). Now a
 * click on a hover-opened trigger keeps it open; a click on a click-opened
 * one still toggles. Touch has no hover, so it keeps the plain toggle.
 */
export function useHoverPopover(options: UseHoverPopoverOptions = {}) {
  const { disabled = false, onOpenChange, keepOpen } = options
  const [open, setOpenState] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openedByHover = useRef(false)
  const lastPointerDown = useRef(0)
  const keepOpenRef = useRef(keepOpen)
  useEffect(() => {
    keepOpenRef.current = keepOpen
  })

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const setOpen = useCallback(
    (next: boolean) => {
      clearTimer()
      const fromClick = Date.now() - lastPointerDown.current < CLICK_WINDOW_MS
      lastPointerDown.current = 0
      if (!next && fromClick && openedByHover.current) {
        openedByHover.current = false
        return
      }
      if (!next) openedByHover.current = false
      setOpenState(next)
      onOpenChange?.(next)
    },
    [clearTimer, onOpenChange]
  )

  const handleEnter = useCallback(() => {
    if (disabled) return
    clearTimer()
    setOpenState(prev => {
      if (!prev) openedByHover.current = true
      return true
    })
    onOpenChange?.(true)
  }, [disabled, clearTimer, onOpenChange])

  const handleLeave = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      if (keepOpenRef.current?.()) return
      openedByHover.current = false
      setOpenState(false)
      onOpenChange?.(false)
    }, CLOSE_DELAY)
  }, [clearTimer, onOpenChange])

  const triggerProps = {
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onPointerDown: () => {
      lastPointerDown.current = Date.now()
    }
  }

  const contentProps = {
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave
  }

  return { open, setOpen, triggerProps, contentProps } as const
}
