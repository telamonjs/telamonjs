import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BaseForm } from './BaseForm'
import type { FormSection } from '../../types/forms/admin-form'

const sections: FormSection[] = [
  { label: 'Info', fields: [{ name: 'name', label: 'Name', type: 'text' }] },
]

describe('BaseForm onStateChange debounce', () => {
  afterEach(() => vi.useRealTimers())

  it('coalesces quick keystrokes into a single call with changeCount 5', async () => {
    vi.useFakeTimers()
    const onStateChange = vi.fn()
    render(
      <BaseForm
        sections={sections}
        initialValues={{ name: '' }}
        onStateChange={onStateChange}
        onStateChangeDebounce={300}
      />
    )
    const input = screen.getByLabelText('Name')
    for (const v of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
      fireEvent.change(input, { target: { value: v } })
      await act(async () => {
        vi.advanceTimersByTime(50)
      })
    }
    expect(onStateChange).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange.mock.calls[0][1].changeCount).toBe(5)
  })
})
