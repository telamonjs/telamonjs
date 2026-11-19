import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFormDraft } from './useFormDraft'

describe('useFormDraft identities', () => {
  it('keeps updateDraft and hasDraft stable across renders', () => {
    const { result, rerender } = renderHook(() => useFormDraft('k-stable'))
    const first = result.current
    rerender()
    expect(result.current.updateDraft).toBe(first.updateDraft)
    expect(result.current.hasDraft).toBe(first.hasDraft)
  })
})
