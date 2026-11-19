import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('handles conditional classes', () => {
    const isTrue = true
    const isFalse = false
    expect(cn('base-class', isTrue && 'conditional-class')).toBe(
      'base-class conditional-class'
    )
    expect(cn('base-class', isFalse && 'conditional-class')).toBe(
      'base-class'
    )
  })

  it('handles objects with boolean values', () => {
    expect(
      cn({
        'class-1': true,
        'class-2': false,
        'class-3': true,
      })
    ).toBe('class-1 class-3')
  })

  it('handles arrays of classes', () => {
    expect(cn(['class-1', 'class-2'], 'class-3')).toBe(
      'class-1 class-2 class-3'
    )
  })

  it('resolves Tailwind conflicts correctly', () => {
    expect(cn('px-2 px-4')).toBe('px-4')
    expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500')
  })

  it('handles empty and undefined inputs', () => {
    expect(cn()).toBe('')
    expect(cn(undefined, null, '')).toBe('')
  })

  it('handles complex combinations', () => {
    const result = cn(
      'base-class',
      { conditional: true, hidden: false },
      ['array-class-1', 'array-class-2'],
      'final-class'
    )
    expect(result).toBe(
      'base-class conditional array-class-1 array-class-2 final-class'
    )
  })
})
