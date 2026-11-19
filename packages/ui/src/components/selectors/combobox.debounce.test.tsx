import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { ControllerRenderProps } from 'react-hook-form'
import { Combobox, type IOption } from './combobox'

vi.unmock('../../ui/popover')

const mkField = (value = ''): ControllerRenderProps => ({
  name: 'rel',
  value,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
})

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(400)
  })

describe('Combobox search', () => {
  afterEach(() => vi.useRealTimers())

  async function open() {
    fireEvent.click(screen.getByRole('combobox'))
    await flush()
  }

  it('debounces quick keystrokes into one loadOptions call', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async (): Promise<IOption[]> => [])
    render(<Combobox field={mkField()} loadOptions={loadOptions} />)
    await flush()
    await open()
    loadOptions.mockClear()
    const input = screen.getByRole('textbox')
    for (const v of ['a', 'ab', 'abc', 'abcd']) {
      fireEvent.change(input, { target: { value: v } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50)
      })
    }
    await flush()
    expect(loadOptions).toHaveBeenCalledTimes(1)
    expect(loadOptions.mock.calls[0][0]).toBe('abcd')
  })

  it('drops a stale slower response', async () => {
    vi.useFakeTimers()
    const resolvers: Record<string, (o: IOption[]) => void> = {}
    const loadOptions = vi.fn(
      (s?: string) =>
        new Promise<IOption[]>(res => {
          resolvers[s ?? ''] = res
        })
    )
    render(<Combobox field={mkField()} loadOptions={loadOptions} />)
    await flush()
    resolvers['']?.([])
    await open()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'old' } })
    await flush()
    fireEvent.change(input, { target: { value: 'new' } })
    await flush()
    await act(async () => {
      resolvers['new']([{ value: '2', label: 'NEW' }])
    })
    await act(async () => {
      resolvers['old']([{ value: '1', label: 'OLD' }])
    })
    expect(screen.getByText('NEW')).toBeInTheDocument()
    expect(screen.queryByText('OLD')).toBeNull()
  })

  it('does not refetch when field.value changes after selection', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(
      async (): Promise<IOption[]> => [{ value: '1', label: 'One' }]
    )
    const { rerender } = render(
      <Combobox field={mkField()} loadOptions={loadOptions} />
    )
    await flush()
    const calls = loadOptions.mock.calls.length
    rerender(<Combobox field={mkField('1')} loadOptions={loadOptions} />)
    await flush()
    expect(loadOptions.mock.calls.length).toBe(calls)
  })
})
