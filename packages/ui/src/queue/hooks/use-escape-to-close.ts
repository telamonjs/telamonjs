'use client'

import { useEffect, useRef } from 'react'

// Open hand-rolled modals, innermost last: ESC closes only the top one
// (FailureGroupsModal → JobsListModal → detail).
const stack: Array<() => void> = []

/**
 * Closes a hand-rolled (non-Radix) modal on Escape while `active`. Nested modals
 * close one at a time; an Escape already handled by a Radix layer on top (e.g. a
 * confirmation AlertDialog, which calls preventDefault) is ignored.
 */
export function useEscapeToClose(active: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!active) return undefined
    const entry = () => onCloseRef.current()
    stack.push(entry)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || stack[stack.length - 1] !== entry) return
      e.preventDefault()
      entry()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      stack.splice(stack.indexOf(entry), 1)
    }
  }, [active])
}
