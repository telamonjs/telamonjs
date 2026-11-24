import type { MouseEvent } from 'react'

/** Clicks on these keep their own meaning; they never also trigger the row. */
const INTERACTIVE = 'button, a[href], input, textarea, select'

/**
 * Whether a click on a clickable row (or card) is a click on the row itself.
 *
 * React bubbles synthetic events through the component tree, not the DOM:
 * a click inside content a cell renders in a portal (a row action's confirm
 * dialog, the "..." menu, a popover) still reaches the row's `onClick`. Only
 * targets inside the row's own DOM count, minus interactive elements.
 */
export function isOwnRowClick(event: MouseEvent<Element>): boolean {
  const target = event.target
  if (!(target instanceof Element)) return false
  if (!event.currentTarget.contains(target)) return false
  return !target.closest(INTERACTIVE)
}
