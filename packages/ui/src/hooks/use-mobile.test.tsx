import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

describe('useIsMobile', () => {
  let mockMatchMedia: any
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    mockMatchMedia = vi.fn()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('returns true for mobile screen sizes', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    })

    const mockMql = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    mockMatchMedia.mockReturnValue(mockMql)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('returns false for desktop screen sizes', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const mockMql = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    mockMatchMedia.mockReturnValue(mockMql)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('updates when screen size changes', () => {
    const mockMql = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    mockMatchMedia.mockReturnValue(mockMql)

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    // Simulate screen size change
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    })

    // Simulate the media query change event — the hook reads `e.matches`
    // from the event object passed to the handler
    act(() => {
      const changeHandler = mockMql.addEventListener.mock.calls[0][1]
      changeHandler({ matches: true })
    })

    expect(result.current).toBe(true)
  })

  it('cleans up event listeners on unmount', () => {
    const mockMql = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    mockMatchMedia.mockReturnValue(mockMql)

    const { unmount } = renderHook(() => useIsMobile())

    expect(mockMql.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )

    unmount()

    expect(mockMql.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )
  })
})
