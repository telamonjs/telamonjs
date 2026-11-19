import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useHoverPopover } from './use-hover-popover'

type Hook = { current: ReturnType<typeof useHoverPopover> }

/** Radix calls onOpenChange(!open) on a trigger click, right after pointerdown */
const click = (h: Hook) =>
  act(() => {
    h.current.triggerProps.onPointerDown()
    h.current.setOpen(!h.current.open)
  })

describe('useHoverPopover (hover + click)', () => {
  it('hover opens, the click that follows keeps it open, the next one closes', () => {
    const { result } = renderHook(() => useHoverPopover())
    act(() => result.current.triggerProps.onMouseEnter())
    expect(result.current.open).toBe(true)
    click(result)
    expect(result.current.open).toBe(true)
    click(result)
    expect(result.current.open).toBe(false)
  })

  it('opened by touch (no hover): click toggles', () => {
    const { result } = renderHook(() => useHoverPopover())
    click(result)
    expect(result.current.open).toBe(true)
    click(result)
    expect(result.current.open).toBe(false)
  })

  it('closing away from the trigger (Esc, outside click, selection) closes even when hover-opened', () => {
    const { result } = renderHook(() => useHoverPopover())
    act(() => result.current.triggerProps.onMouseEnter())
    act(() => result.current.setOpen(false))
    expect(result.current.open).toBe(false)
  })

  it('disabled ignores hover', () => {
    const { result } = renderHook(() => useHoverPopover({ disabled: true }))
    act(() => result.current.triggerProps.onMouseEnter())
    expect(result.current.open).toBe(false)
  })
})
