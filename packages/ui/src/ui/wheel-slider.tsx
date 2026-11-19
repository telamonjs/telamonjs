'use client'

import * as React from 'react'
import { useRef, useEffect } from 'react'
import { Slider } from './slider'

type SliderProps = React.ComponentPropsWithoutRef<typeof Slider>

interface WheelSliderProps extends SliderProps {
  /**
   * Optional external ref for the wheel event target.
   * When provided, the wheel listener attaches to that element instead of the slider wrapper.
   * Use this to make a larger area (e.g. the full row) respond to wheel events.
   */
  wheelContainerRef?: React.RefObject<HTMLElement | null>
}

/**
 * WheelSlider - Slider with mouse wheel support
 *
 * Scroll up increments, scroll down decrements.
 * Uses native event listener with { passive: false } so preventDefault() works.
 */
const WheelSlider = React.forwardRef<
  React.ElementRef<typeof Slider>,
  WheelSliderProps
>(({ value, onValueChange, min = 0, max = 100, step = 1, className, wheelContainerRef, ...props }, ref) => {
  const internalRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const onChangeRef = useRef(onValueChange)
  onChangeRef.current = onValueChange

  const minRef = useRef(min)
  const maxRef = useRef(max)
  const stepRef = useRef(step)
  minRef.current = min
  maxRef.current = max
  stepRef.current = step

  useEffect(() => {
    const el = wheelContainerRef?.current ?? internalRef.current
    if (!el) return

    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const vals = valueRef.current
      if (!vals || !Array.isArray(vals) || !onChangeRef.current) return
      const delta = e.deltaY < 0 ? stepRef.current : -stepRef.current
      const next = Math.max(minRef.current, Math.min(maxRef.current, vals[0] + delta))
      if (next !== vals[0]) {
        onChangeRef.current([next])
      }
    }

    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [wheelContainerRef])

  return (
    <div ref={internalRef} className={className}>
      <Slider
        ref={ref}
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    </div>
  )
})
WheelSlider.displayName = 'WheelSlider'

export { WheelSlider }
export type { WheelSliderProps }
