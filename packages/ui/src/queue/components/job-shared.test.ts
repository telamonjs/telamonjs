/**
 * job-shared unit tests — `formatDuration` locale-aware formatting.
 *
 * Native `Intl.NumberFormat(locale, { style: 'unit', unitDisplay: 'narrow' })`
 * replaced hardcoded `ms`/`s`/`min` suffixes; this pins the real ICU output
 * for the 3 locales the lib ships (pt-BR/en/es) across the ms/s/min branches.
 *
 * Source of truth (read, not altered): src/queue/components/job-shared.tsx
 */

import { describe, it, expect } from 'vitest'
import { formatDuration } from './job-shared'

describe('formatDuration', () => {
  describe('pt-BR', () => {
    it('formats sub-second durations in milliseconds', () => {
      expect(formatDuration(0, 500, 'pt-BR')).toBe('500 ms')
    })

    it('formats durations under a minute in seconds', () => {
      expect(formatDuration(0, 1500, 'pt-BR')).toBe('1,5 s')
    })

    it('formats durations of a minute or more in minutes', () => {
      expect(formatDuration(0, 125_000, 'pt-BR')).toBe('2,08 min')
    })
  })

  describe('en', () => {
    it('formats sub-second durations in milliseconds', () => {
      expect(formatDuration(0, 500, 'en')).toBe('500ms')
    })

    it('formats durations under a minute in seconds', () => {
      expect(formatDuration(0, 1500, 'en')).toBe('1.5s')
    })

    it('formats durations of a minute or more in minutes', () => {
      expect(formatDuration(0, 125_000, 'en')).toBe('2.08m')
    })
  })

  describe('es', () => {
    it('formats sub-second durations in milliseconds', () => {
      expect(formatDuration(0, 500, 'es')).toBe('500ms')
    })

    it('formats durations under a minute in seconds', () => {
      expect(formatDuration(0, 1500, 'es')).toBe('1,5s')
    })

    it('formats durations of a minute or more in minutes', () => {
      expect(formatDuration(0, 125_000, 'es')).toBe('2,08min')
    })
  })

  describe('digits override (JobEventTimeline rounding: 1 decimal for seconds, whole minutes)', () => {
    const digits = { seconds: 1, minutes: 0 }

    it('pt-BR', () => {
      expect(formatDuration(1000, 1500, 'pt-BR', digits)).toBe('500 ms')
      expect(formatDuration(1000, 2500, 'pt-BR', digits)).toBe('1,5 s')
      expect(formatDuration(1000, 126_000, 'pt-BR', digits)).toBe('2 min')
    })

    it('en', () => {
      expect(formatDuration(1000, 1500, 'en', digits)).toBe('500ms')
      expect(formatDuration(1000, 2500, 'en', digits)).toBe('1.5s')
      expect(formatDuration(1000, 126_000, 'en', digits)).toBe('2m')
    })

    it('es', () => {
      expect(formatDuration(1000, 1500, 'es', digits)).toBe('500ms')
      expect(formatDuration(1000, 2500, 'es', digits)).toBe('1,5s')
      expect(formatDuration(1000, 126_000, 'es', digits)).toBe('2min')
    })
  })
})
