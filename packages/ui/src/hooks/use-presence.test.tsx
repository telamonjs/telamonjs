import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePresence } from './use-presence'

describe('usePresence', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mounts immediately when opened and reports open state', () => {
    const { result } = renderHook(() => usePresence(true, 200))
    expect(result.current).toEqual({ mounted: true, state: 'open' })
  })

  it('stays mounted in closed state until the exit duration elapses', () => {
    const { result, rerender } = renderHook(({ o }) => usePresence(o, 200), {
      initialProps: { o: true },
    })
    rerender({ o: false })
    expect(result.current).toEqual({ mounted: true, state: 'closed' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toEqual({ mounted: false, state: 'closed' })
  })

  it('re-opening during exit cancels the unmount', () => {
    const { result, rerender } = renderHook(({ o }) => usePresence(o, 200), {
      initialProps: { o: true },
    })
    rerender({ o: false })
    rerender({ o: true })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toEqual({ mounted: true, state: 'open' })
  })

  it('never mounts while closed from the start', () => {
    const { result } = renderHook(() => usePresence(false, 200))
    expect(result.current.mounted).toBe(false)
  })
})
