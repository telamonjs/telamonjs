/**
 * Characterization + regression tests for `useFormDraft`.
 *
 * Regression focus (gaps catalog #12, item "useFormDraft destroys
 * File"): `File`/`Blob` have no own enumerable properties, so
 * `JSON.stringify` silently turned them into `{}` before this fix — the
 * candidate would see "draft saved" and reload to find the attachment
 * gone. `stripUnserializable` (internal) now excludes them from what gets
 * persisted, without changing the hook's public API.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFormDraft } from './useFormDraft'

interface FormShape {
  nome: string
  email: string
  anexo?: File | null
  aninhado?: { arquivo?: File | null; texto?: string }
}

const STORAGE_KEY = 'test-wizard-draft'

function readStoredDraft() {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

describe('useFormDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('starts from initialData when nothing is stored', () => {
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: 'inicial', email: '' })
      )

      expect(result.current.draft).toEqual({ nome: 'inicial', email: '' })
      expect(result.current.lastSaved).toBeNull()
    })

    it('restores a draft already saved in localStorage', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          formId: STORAGE_KEY,
          data: { nome: 'Ana', email: 'ana@example.com' },
        })
      )

      const { result } = renderHook(() => useFormDraft<FormShape>(STORAGE_KEY))

      expect(result.current.draft).toEqual({
        nome: 'Ana',
        email: 'ana@example.com',
      })
    })

    it('ignores (and clears) a draft older than 7 days', () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timestamp: eightDaysAgo,
          formId: STORAGE_KEY,
          data: { nome: 'Expirado', email: '' },
        })
      )

      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )

      expect(result.current.draft).toEqual({ nome: '', email: '' })
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('Interactions', () => {
    it('updateDraft merges partial updates into the existing draft', () => {
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )

      act(() => {
        result.current.updateDraft({ nome: 'Bia' })
      })
      act(() => {
        result.current.updateDraft({ email: 'bia@example.com' })
      })

      expect(result.current.draft).toEqual({
        nome: 'Bia',
        email: 'bia@example.com',
      })
    })

    it('clearDraft resets state and removes the localStorage entry', () => {
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )

      act(() => {
        result.current.updateDraft({ nome: 'Carlos' })
      })
      localStorage.setItem(STORAGE_KEY, 'anything') // simulate a persisted save

      act(() => {
        result.current.clearDraft()
      })

      expect(result.current.draft).toEqual({ nome: '', email: '' })
      expect(result.current.lastSaved).toBeNull()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('State Management (auto-save)', () => {
    it('persists to localStorage after the 1s debounce and sets lastSaved', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )

      act(() => {
        result.current.updateDraft({ nome: 'Dani' })
      })

      expect(readStoredDraft()).toBeNull()

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(readStoredDraft().data).toEqual({ nome: 'Dani', email: '' })
      expect(result.current.lastSaved).toBeInstanceOf(Date)
    })

    it('debounces: only the last update within 1s is the one persisted', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )

      act(() => {
        result.current.updateDraft({ nome: 'E' })
      })
      act(() => {
        vi.advanceTimersByTime(500)
      })
      act(() => {
        result.current.updateDraft({ nome: 'Eva' })
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(readStoredDraft().data.nome).toBe('Eva')
    })
  })

  describe('Edge Cases (File/Blob stripping)', () => {
    it('excludes a top-level File from what is persisted', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )
      const anexo = new File(['conteudo'], 'comprovante.pdf', {
        type: 'application/pdf',
      })

      act(() => {
        result.current.updateDraft({ nome: 'Fabio', anexo })
      })

      // in-memory draft still holds the real File (needed while the wizard
      // step is mounted / re-mounted before the debounce fires)
      expect(result.current.draft.anexo).toBe(anexo)

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      const persisted = readStoredDraft().data
      expect(persisted.nome).toBe('Fabio')
      expect(persisted).not.toHaveProperty('anexo')
      // pre-fix behavior: JSON.stringify(new File(...)) serializes to `{}`,
      // which would show up as an (empty-object) "anexo" key here.
      expect(JSON.stringify(persisted)).not.toContain('anexo')
    })

    it('excludes a File nested inside a plain object from what is persisted', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )
      const arquivo = new File(['x'], 'doc.pdf')

      act(() => {
        result.current.updateDraft({
          aninhado: { arquivo, texto: 'observação' },
        })
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      const persisted = readStoredDraft().data
      expect(persisted.aninhado.texto).toBe('observação')
      expect(persisted.aninhado).not.toHaveProperty('arquivo')
    })
  })

  describe('Accessibility', () => {
    it('exposes hasDraft() reflecting what is actually in localStorage', async () => {
      const { result } = renderHook(() =>
        useFormDraft<FormShape>(STORAGE_KEY, { nome: '', email: '' })
      )
      expect(result.current.hasDraft()).toBe(false)

      vi.useFakeTimers({ shouldAdvanceTime: true })
      act(() => {
        result.current.updateDraft({ nome: 'Gil' })
      })
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => expect(result.current.hasDraft()).toBe(true))
    })
  })
})
