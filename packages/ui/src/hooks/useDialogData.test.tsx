import { act, renderHook, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { telamonjsMessages } from '../i18n/messages'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDialogData } from './useDialogData'
import { logger } from '../utils/logger'

describe('useDialogData', () => {
  // Mock fetch function
  const mockFetchAction = vi.fn()

  beforeEach(() => {
    mockFetchAction.mockClear()
  })

  // 1. Rendering tests
  describe('Rendering', () => {
    it('initializes with null data and not loading', () => {
      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, false)
      )

      expect(result.current.data).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('provides all expected return values', () => {
      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, false)
      )

      expect(result.current).toHaveProperty('data')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('refetch')
      expect(result.current).toHaveProperty('setData')
      expect(result.current).toHaveProperty('clearError')
    })
  })

  // 2. Interaction tests
  describe('Interactions', () => {
    it('fetches data when open is true and id exists', async () => {
      const mockData = { id: '123', name: 'Test' }
      mockFetchAction.mockResolvedValue(mockData)

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(mockFetchAction).toHaveBeenCalledWith('123')
        expect(result.current.data).toEqual(mockData)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('does not fetch when open is false', async () => {
      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, false)
      )

      await waitFor(() => {
        expect(mockFetchAction).not.toHaveBeenCalled()
        expect(result.current.data).toBeNull()
      })
    })

    it('does not fetch when id is null', async () => {
      const { result } = renderHook(() =>
        useDialogData(null, mockFetchAction, true)
      )

      await waitFor(() => {
        expect(mockFetchAction).not.toHaveBeenCalled()
        expect(result.current.data).toBeNull()
      })
    })

    it('does not fetch when id is undefined', async () => {
      const { result } = renderHook(() =>
        useDialogData(undefined, mockFetchAction, true)
      )

      await waitFor(() => {
        expect(mockFetchAction).not.toHaveBeenCalled()
        expect(result.current.data).toBeNull()
      })
    })

    it('refetches data when refetch is called', async () => {
      const mockData1 = { id: '123', name: 'Test 1' }
      const mockData2 = { id: '123', name: 'Test 2' }

      mockFetchAction
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1)
      })

      result.current.refetch()

      await waitFor(() => {
        expect(mockFetchAction).toHaveBeenCalledTimes(2)
        expect(result.current.data).toEqual(mockData2)
      })
    })

    it('refetchSilent mantém data e não pisca loading', async () => {
      const mockData1 = { id: '123', name: 'Test 1' }
      const mockData2 = { id: '123', name: 'Test 2' }

      mockFetchAction
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => expect(result.current.data).toEqual(mockData1))

      act(() => result.current.refetchSilent())

      // data never becomes null midway: the dialog form does not unmount
      expect(result.current.data).toEqual(mockData1)
      expect(result.current.isLoading).toBe(false)

      await waitFor(() => expect(result.current.data).toEqual(mockData2))
    })

    it('refetchSilent que falha não derruba o conteúdo já carregado', async () => {
      const mockData = { id: '123', name: 'Test 1' }
      mockFetchAction
        .mockResolvedValueOnce(mockData)
        .mockRejectedValueOnce(new Error('Rede caiu'))

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => expect(result.current.data).toEqual(mockData))

      act(() => result.current.refetchSilent())

      await waitFor(() => expect(mockFetchAction).toHaveBeenCalledTimes(2))
      expect(result.current.error).toBeNull()
      expect(result.current.data).toEqual(mockData)
    })

    it('manually sets data when setData is called', async () => {
      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, false)
      )

      const newData = { id: '123', name: 'Manual Data' }
      result.current.setData(newData)

      await waitFor(() => {
        expect(result.current.data).toEqual(newData)
      })
    })

    it('clears error when clearError is called', async () => {
      mockFetchAction.mockRejectedValue(new Error('Fetch failed'))

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed')
      })

      result.current.clearError()

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  // 3. State management
  describe('State Management', () => {
    it('sets loading to true during fetch', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockFetchAction.mockReturnValue(slowPromise)

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      resolvePromise!({ id: '123' })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('resets state when dialog closes', async () => {
      const mockData = { id: '123', name: 'Test' }
      mockFetchAction.mockResolvedValue(mockData)

      const { result, rerender } = renderHook(
        ({ open }) => useDialogData('123', mockFetchAction, open),
        { initialProps: { open: true } }
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData)
      })

      rerender({ open: false })

      // Wait for reset delay (default 200ms)
      await waitFor(
        () => {
          expect(result.current.data).toBeNull()
          expect(result.current.error).toBeNull()
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 300 }
      )
    })

    it('respects custom resetDelay option', async () => {
      const mockData = { id: '123', name: 'Test' }
      mockFetchAction.mockResolvedValue(mockData)

      const { result, rerender } = renderHook(
        ({ open }) =>
          useDialogData('123', mockFetchAction, open, { resetDelay: 50 }),
        { initialProps: { open: true } }
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData)
      })

      rerender({ open: false })

      // Data is kept during the close animation window (custom 50ms delay)
      expect(result.current.data).toEqual(mockData)

      await waitFor(
        () => {
          expect(result.current.data).toBeNull()
        },
        { timeout: 1000 }
      )
    })
  })

  // 4. Edge cases
  describe('Edge Cases', () => {
    it('handles fetch errors correctly', async () => {
      const errorMessage = 'Network error'
      mockFetchAction.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage)
        expect(result.current.data).toBeNull()
        expect(result.current.isLoading).toBe(false)
      })
    })

    // A 404 carries the backend's raw (often English) message — "Equipamento
    // with id 9 not found". Show the translated not-found text instead.
    it.each([
      ['status', { status: 404 }],
      ['statusCode', { statusCode: 404 }],
    ])('translates a 404 (%s) instead of the raw message', async (_, extra) => {
      mockFetchAction.mockRejectedValue(
        Object.assign(new Error('Equipamento with id 9 not found'), extra)
      )

      const { result } = renderHook(() =>
        useDialogData('9', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Registro não encontrado')
      })
    })

    it('translates a 404 in the active locale (en)', async () => {
      mockFetchAction.mockRejectedValue(
        Object.assign(new Error('Equipamento with id 9 not found'), {
          status: 404,
        })
      )
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale='en' messages={telamonjsMessages.en}>
          {children}
        </NextIntlClientProvider>
      )

      const { result } = renderHook(
        () => useDialogData('9', mockFetchAction, true),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Record not found')
      })
    })

    it('handles non-Error objects in catch', async () => {
      mockFetchAction.mockRejectedValue('String error')

      const { result } = renderHook(() =>
        useDialogData('123', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Erro ao carregar dados')
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('handles empty string id', async () => {
      const { result } = renderHook(() =>
        useDialogData('', mockFetchAction, true)
      )

      await waitFor(() => {
        expect(mockFetchAction).not.toHaveBeenCalled()
        expect(result.current.data).toBeNull()
      })
    })

    it('handles id change while dialog is open', async () => {
      const mockData1 = { id: '123', name: 'Test 1' }
      const mockData2 = { id: '456', name: 'Test 2' }

      mockFetchAction
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      const { result, rerender } = renderHook(
        ({ id }) => useDialogData(id, mockFetchAction, true),
        { initialProps: { id: '123' } }
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1)
      })

      rerender({ id: '456' })

      await waitFor(() => {
        expect(mockFetchAction).toHaveBeenCalledWith('456')
        expect(result.current.data).toEqual(mockData2)
      })
    })

    it('clears data before new fetch', async () => {
      const mockData1 = { id: '123', name: 'Test 1' }
      const mockData2 = { id: '456', name: 'Test 2' }

      mockFetchAction
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      const { result, rerender } = renderHook(
        ({ id }) => useDialogData(id, mockFetchAction, true),
        { initialProps: { id: '123' } }
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1)
      })

      rerender({ id: '456' })

      // Data should be cleared immediately when new fetch starts
      expect(result.current.data).toBeNull()
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2)
      })
    })
  })

  // 5. Accessibility (lifecycle callbacks)
  describe('Callbacks', () => {
    it('calls onSuccess when fetch succeeds', async () => {
      const onSuccess = vi.fn()
      const mockData = { id: '123', name: 'Test' }
      mockFetchAction.mockResolvedValue(mockData)

      renderHook(() =>
        useDialogData('123', mockFetchAction, true, { onSuccess })
      )

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('calls onError when fetch fails', async () => {
      const onError = vi.fn()
      const error = new Error('Fetch failed')
      mockFetchAction.mockRejectedValue(error)

      renderHook(() => useDialogData('123', mockFetchAction, true, { onError }))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error)
      })
    })

    it('does not call onSuccess when fetch fails', async () => {
      const onSuccess = vi.fn()
      mockFetchAction.mockRejectedValue(new Error('Fetch failed'))

      renderHook(() =>
        useDialogData('123', mockFetchAction, true, { onSuccess })
      )

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled()
      })
    })

    it('does not call onError when fetch succeeds', async () => {
      const onError = vi.fn()
      const mockData = { id: '123', name: 'Test' }
      mockFetchAction.mockResolvedValue(mockData)

      renderHook(() => useDialogData('123', mockFetchAction, true, { onError }))

      await waitFor(() => {
        expect(onError).not.toHaveBeenCalled()
      })
    })
  })

  // 6. Console logging
  describe('Error Logging', () => {
    it('logs errors to console', async () => {
      const loggerErrorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {})
      const error = new Error('Fetch failed')
      mockFetchAction.mockRejectedValue(error)

      renderHook(() => useDialogData('123', mockFetchAction, true))

      await waitFor(() => {
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          '[useDialogData] Fetch error',
          expect.objectContaining({ error: expect.anything() })
        )
      })

      loggerErrorSpy.mockRestore()
    })
  })
})
