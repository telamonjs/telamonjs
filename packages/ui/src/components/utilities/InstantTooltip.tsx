'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Hint = { text: string; x: number; y: number; above: boolean }

const TARGET = 'button, a, [role="button"], [data-tooltip-text]'
const VIEWPORT_MARGIN = 8

/** Text the user can see: innerText skips CSS-hidden text, sr-only is removed by hand. */
function visibleText(el: HTMLElement): string {
  let visible = el.innerText ?? ''
  el.querySelectorAll('.sr-only').forEach(hidden => {
    visible = visible.replace(hidden.textContent ?? '', '')
  })
  return visible.trim()
}

function hintFor(el: HTMLElement): string | null {
  const visible = visibleText(el)
  // Explicit text (e.g. a row action's `tooltip`) also applies to labelled
  // buttons, unless it would only repeat the label.
  const explicit = el.dataset.tooltipText
  if (explicit) return explicit === visible ? null : explicit
  if (visible) return null
  return (
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    el.textContent?.trim() ||
    null
  )
}

/**
 * Immediate hint for icon-only buttons and links, mounted once by AppProviders:
 * shows the `aria-label` / `title` of the element under the mouse instead of
 * the native tooltip, which takes about a second.
 *
 * - An element with visible text gets no hint, unless it has `data-tooltip-text`.
 * - `data-tooltip="off"` opts out. `TooltipTrigger` sets it, so an element with
 *   its own Radix tooltip never shows two.
 * - Mouse only: touch has no hover.
 */
export function InstantTooltip() {
  const [hint, setHint] = useState<Hint | null>(null)
  const box = useRef<HTMLDivElement>(null)

  // A centered hint near the edge would leave the viewport: push it back in.
  useLayoutEffect(() => {
    const el = box.current
    if (!el || !hint) return
    el.style.marginLeft = '0px' // the box is reused between hints
    const rect = el.getBoundingClientRect()
    const shift =
      rect.right > window.innerWidth - VIEWPORT_MARGIN
        ? window.innerWidth - VIEWPORT_MARGIN - rect.right
        : rect.left < VIEWPORT_MARGIN
          ? VIEWPORT_MARGIN - rect.left
          : 0
    el.style.marginLeft = `${shift}px`
  }, [hint])

  useEffect(() => {
    let current: HTMLElement | null = null
    let savedTitle: string | null = null

    const clear = () => {
      // The title leaves while hovering so the native tooltip stays out of the way
      if (current && savedTitle !== null) {
        current.setAttribute('title', savedTitle)
      }
      current = null
      savedTitle = null
      setHint(null)
    }

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const el = (event.target as Element | null)?.closest?.(
        TARGET
      ) as HTMLElement | null
      if (el === current) return
      clear()
      if (!el || el.dataset.tooltip === 'off') return
      const text = hintFor(el)
      if (!text) return

      current = el
      savedTitle = el.getAttribute('title')
      if (savedTitle !== null) el.removeAttribute('title')

      const rect = el.getBoundingClientRect()
      const above = rect.bottom + 44 > window.innerHeight
      setHint({
        text,
        x: rect.left + rect.width / 2,
        y: above ? rect.top - 6 : rect.bottom + 6,
        above,
      })
    }

    const onOut = (event: PointerEvent) => {
      if (current && !current.contains(event.relatedTarget as Node | null)) {
        clear()
      }
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointerdown', clear, true)
    window.addEventListener('scroll', clear, true)
    return () => {
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointerdown', clear, true)
      window.removeEventListener('scroll', clear, true)
      clear()
    }
  }, [])

  if (!hint) return null
  return createPortal(
    <div
      ref={box}
      role='tooltip'
      // w-max: without it the box shrinks near the right edge and wraps the text
      className='pointer-events-none fixed z-[10000] w-max max-w-[min(20rem,calc(100vw-16px))] rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md'
      style={{
        left: hint.x,
        top: hint.y,
        transform: `translate(-50%, ${hint.above ? '-100%' : '0'})`,
      }}
    >
      {hint.text}
    </div>,
    document.body
  )
}
