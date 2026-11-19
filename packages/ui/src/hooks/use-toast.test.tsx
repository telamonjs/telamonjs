import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, toast, reducer } from './use-toast'

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the toast state
    vi.clearAllTimers()
  })

  it('provides toast function and state', () => {
    const { result } = renderHook(() => useToast())

    expect(result.current).toHaveProperty('toast')
    expect(result.current).toHaveProperty('toasts')
    expect(result.current).toHaveProperty('dismiss')
    expect(typeof result.current.toast).toBe('function')
    expect(Array.isArray(result.current.toasts)).toBe(true)
  })

  it('creates toast with correct properties', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'This is a test toast',
        variant: 'default',
      })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Test Toast',
      description: 'This is a test toast',
      variant: 'default',
      open: true,
    })
  })

  it('limits number of toasts', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Toast 1' })
      result.current.toast({ title: 'Toast 2' })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('Toast 2')
  })

  it('dismisses toasts correctly', () => {
    const { result } = renderHook(() => useToast())

    let toastId: string

    act(() => {
      const toastResult = result.current.toast({ title: 'Test Toast' })
      toastId = toastResult.id
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss(toastId)
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  it('dismisses all toasts when no ID provided', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Toast 1' })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  it('provides update functionality', () => {
    const { result } = renderHook(() => useToast())

    let toastResult: any

    act(() => {
      toastResult = result.current.toast({ title: 'Original Title' })
    })

    act(() => {
      toastResult.update({ title: 'Updated Title' })
    })

    expect(result.current.toasts[0].title).toBe('Updated Title')
  })
})

describe('toast reducer', () => {
  it('handles ADD_TOAST action', () => {
    const initialState = { toasts: [] }
    const toastItem = {
      id: '1',
      title: 'Test',
      open: true,
    }

    const newState = reducer(initialState, {
      type: 'ADD_TOAST',
      toast: toastItem,
    })

    expect(newState.toasts).toHaveLength(1)
    expect(newState.toasts[0]).toEqual(toastItem)
  })

  it('handles UPDATE_TOAST action', () => {
    const initialState = {
      toasts: [{ id: '1', title: 'Original', open: true }],
    }

    const newState = reducer(initialState, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    })

    expect(newState.toasts[0].title).toBe('Updated')
  })

  it('handles DISMISS_TOAST action', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    }

    const newState = reducer(initialState, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    })

    expect(newState.toasts[0].open).toBe(false)
    expect(newState.toasts[1].open).toBe(true)
  })

  it('handles DISMISS_TOAST action without ID (dismiss all)', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    }

    const newState = reducer(initialState, {
      type: 'DISMISS_TOAST',
    })

    expect(newState.toasts.every(t => !t.open)).toBe(true)
  })

  it('handles REMOVE_TOAST action', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    }

    const newState = reducer(initialState, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    })

    expect(newState.toasts).toHaveLength(1)
    expect(newState.toasts[0].id).toBe('2')
  })

  it('handles REMOVE_TOAST action without ID (remove all)', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'Toast 1', open: true },
        { id: '2', title: 'Toast 2', open: true },
      ],
    }

    const newState = reducer(initialState, {
      type: 'REMOVE_TOAST',
    })

    expect(newState.toasts).toHaveLength(0)
  })
})

describe('Standalone toast function', () => {
  it('creates toast and returns control functions', () => {
    const toastResult = toast({
      title: 'Standalone Toast',
      description: 'Test description',
    })

    expect(toastResult).toHaveProperty('id')
    expect(toastResult).toHaveProperty('dismiss')
    expect(toastResult).toHaveProperty('update')
    expect(typeof toastResult.dismiss).toBe('function')
    expect(typeof toastResult.update).toBe('function')
  })

  it('dismisses toast using returned function', () => {
    const { result } = renderHook(() => useToast())

    let toastResult: any

    act(() => {
      toastResult = toast({ title: 'Test' })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      toastResult.dismiss()
    })

    expect(result.current.toasts[0].open).toBe(false)
  })
})
