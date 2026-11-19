/**
 * useCopyToClipboard unit tests
 *
 * Ported (NEW) hook — no test existed yet. Pins the intended behavior:
 *   - returns { copied, copy, reset }
 *   - `copied` holds the key (or text) of the last successfully copied item,
 *     and resets to null after a 2s timeout
 *   - `copy` wraps navigator.clipboard.writeText in try/catch and shows a
 *     sonner toast.error on failure (does not throw)
 *   - the pending reset timeout is cleared on unmount
 *
 * Source of truth (read, not altered):
 *   src/queue/hooks/use-copy-to-clipboard.ts
 *
 * Note: this is a plain hook with no DOM output, so the "Accessibility"
 * describe block from the repo's standard structure does not apply and is
 * omitted. "State Management" (copied-state transitions) is covered inline
 * under "Interactions" since every interaction here IS a state transition.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyToClipboard } from './use-copy-to-clipboard'

// Reuse the repo's established sonner mock pattern (see JobDetailModal.test.tsx,
// JobsHistoryModal.test.tsx, HistoricoTab.test.tsx).
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { toast } from 'sonner'

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  })
}

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Explicit toFake per repo convention — fakeing everything breaks React/RTL internals.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('returns copied=null and copy/reset functions initially', () => {
      const { result } = renderHook(() => useCopyToClipboard())
      expect(result.current.copied).toBeNull()
      expect(typeof result.current.copy).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('Interactions', () => {
    it('sets copied to the key after a successful copy', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      stubClipboard(writeText)
      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current.copy('some text', 'my-key')
      })

      expect(writeText).toHaveBeenCalledWith('some text')
      expect(result.current.copied).toBe('my-key')
    })

    it('uses the text itself as the copied key when no key is provided', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      stubClipboard(writeText)
      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current.copy('bare text')
      })

      expect(result.current.copied).toBe('bare text')
    })

    it('resets copied to null after the 2s timeout', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      stubClipboard(writeText)
      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current.copy('x', 'k')
      })
      expect(result.current.copied).toBe('k')

      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(result.current.copied).toBeNull()
    })

    it('reset() clears copied immediately and cancels the pending timeout', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      stubClipboard(writeText)
      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current.copy('x', 'k')
      })
      expect(result.current.copied).toBe('k')

      act(() => {
        result.current.reset()
      })
      expect(result.current.copied).toBeNull()
    })

    it('a new copy() call clears any previously pending reset timeout', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      stubClipboard(writeText)
      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current.copy('first', 'k1')
      })
      // Advance partway — not enough to trigger the first reset
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      await act(async () => {
        await result.current.copy('second', 'k2')
      })
      expect(result.current.copied).toBe('k2')

      // Advance by the remainder of the FIRST timer's window — if the first
      // timer wasn't cleared, it would fire here and wrongly reset copied.
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(result.current.copied).toBe('k2')
    })
  })

  describe('Edge Cases', () => {
    it('catches clipboard errors, shows toast.error, and does not throw', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      stubClipboard(writeText)
      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await expect(result.current.copy('x', 'k')).resolves.toBeUndefined()
      })

      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível copiar para a área de transferência'
      )
      // copied must remain unset on failure
      expect(result.current.copied).toBeNull()
    })

    it('clears the pending reset timeout on unmount', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      stubClipboard(writeText)
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
      const { result, unmount } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current.copy('x', 'k')
      })
      clearTimeoutSpy.mockClear()

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })
})
