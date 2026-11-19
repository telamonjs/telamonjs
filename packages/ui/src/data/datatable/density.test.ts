import { describe, it, expect } from 'vitest'
import { getDensityStyles } from './density'

describe('getDensityStyles', () => {
  it('returns compact classes', () => {
    expect(getDensityStyles('compact')).toBe('py-1 text-xs')
  })

  it('returns spacious classes', () => {
    expect(getDensityStyles('spacious')).toBe('py-4 text-sm')
  })

  it('returns comfortable (default) classes', () => {
    expect(getDensityStyles('comfortable')).toBe('py-2 text-sm')
  })
})
