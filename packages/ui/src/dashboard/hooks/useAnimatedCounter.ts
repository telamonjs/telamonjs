import { useState, useEffect, useRef } from 'react'

/**
 * Hook to animate a counter from previous value to target with easeOutQuart easing
 *
 * @param target - Target value to animate to
 * @param duration - Duration of animation in milliseconds (default: 500ms)
 * @returns Current animated value
 *
 * @example
 * ```tsx
 * const animatedValue = useAnimatedCounter(42, 500)
 * return <span>{Math.round(animatedValue)}</span>
 * ```
 */
export function useAnimatedCounter(
  target: number,
  duration: number = 500
): number {
  const [current, setCurrent] = useState(target)
  const previousValue = useRef(target)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    // Cancel previous animation if exists
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    const startValue = previousValue.current
    const endValue = target
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // EaseOutQuart: 1 - (1 - x)^4
      // Starts fast, decelerates at the end
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)

      const nextValue = Math.round(
        startValue + (endValue - startValue) * easeOutQuart
      )

      setCurrent(nextValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        previousValue.current = endValue
        animationRef.current = null
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [target, duration])

  return current
}
