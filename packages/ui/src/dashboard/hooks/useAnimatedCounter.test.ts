import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAnimatedCounter } from './useAnimatedCounter'

/**
 * The hook initializes at the target value (no animation on mount) and
 * animates with easeOutQuart whenever the target changes.
 * It relies on Date.now() + requestAnimationFrame, so both are faked.
 */
describe('useAnimatedCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'Date',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const advance = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  // 1. Basic rendering
  describe('Rendering', () => {
    it('initializes at the target value', () => {
      const { result } = renderHook(() => useAnimatedCounter(100))
      expect(result.current).toBe(100)
    })

    it('does not animate on mount', () => {
      const { result } = renderHook(() => useAnimatedCounter(100, 500))

      advance(250)
      expect(result.current).toBe(100)

      advance(300)
      expect(result.current).toBe(100)
    })

    it('animates from previous value to new target', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useAnimatedCounter(target, 500),
        { initialProps: { target: 0 } }
      )

      expect(result.current).toBe(0)

      rerender({ target: 100 })

      // Midway through the animation: value is in-flight
      advance(250)
      expect(result.current).toBeGreaterThan(0)
      expect(result.current).toBeLessThan(100)

      // Past the duration: value settles at target
      advance(300)
      expect(result.current).toBe(100)
    })
  })

  // 2. Animation behavior
  describe('Animation', () => {
    it('respects custom duration', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useAnimatedCounter(target, 1000),
        { initialProps: { target: 0 } }
      )

      rerender({ target: 100 })

      // After 500ms of a 1000ms animation, still animating
      advance(500)
      expect(result.current).toBeGreaterThan(0)
      expect(result.current).toBeLessThan(100)

      // After the full duration, animation completes
      advance(600)
      expect(result.current).toBe(100)
    })

    it('uses ease-out easing (larger jumps at start, smaller at end)', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useAnimatedCounter(target, 500),
        { initialProps: { target: 0 } }
      )

      rerender({ target: 100 })

      const values: number[] = [result.current]

      // Sample at fixed intervals during the animation
      for (let i = 0; i < 6; i++) {
        advance(100)
        values.push(result.current)
      }

      const firstJump = values[1] - values[0]
      const lastJump = values[values.length - 1] - values[values.length - 2]
      expect(firstJump).toBeGreaterThan(lastJump)
      expect(values[values.length - 1]).toBe(100)
    })
  })

  // 3. Target changes
  describe('Target Changes', () => {
    it('re-animates when target changes', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useAnimatedCounter(target, 500),
        { initialProps: { target: 100 } }
      )

      expect(result.current).toBe(100)

      // Change target
      rerender({ target: 200 })

      // Should animate to new target
      advance(600)
      expect(result.current).toBe(200)
    })

    it('handles decreasing values', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useAnimatedCounter(target, 500),
        { initialProps: { target: 100 } }
      )

      expect(result.current).toBe(100)

      // Decrease target
      rerender({ target: 50 })

      advance(600)
      expect(result.current).toBe(50)
    })
  })

  // 4. Edge cases
  describe('Edge Cases', () => {
    it('handles zero target', () => {
      const { result } = renderHook(() => useAnimatedCounter(0))
      expect(result.current).toBe(0)
    })

    it('handles negative target', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useAnimatedCounter(target, 500),
        { initialProps: { target: 0 } }
      )

      rerender({ target: -50 })

      advance(600)
      expect(result.current).toBe(-50)
    })

    it('handles very large numbers', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useAnimatedCounter(target, 500),
        { initialProps: { target: 0 } }
      )

      rerender({ target: 1000000 })

      advance(600)
      expect(result.current).toBe(1000000)
    })
  })
})
