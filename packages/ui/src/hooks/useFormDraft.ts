'use client'
import { useCallback, useEffect, useState } from 'react'
import { logger } from '../utils/logger'

interface DraftMetadata<T> {
  timestamp: number
  formId: string
  userId?: string
  data: Partial<T>
  currentStep?: number
}

/**
 * `File`/`Blob` have no own enumerable properties, so `JSON.stringify`
 * silently turns them into `{}` — the draft looks like it saved the upload
 * but restores nothing. Strip them (recursively, arrays and plain objects)
 * before persisting so the key is simply absent from the saved draft; the
 * in-memory `draft` state itself is untouched (it may still hold `File`
 * values between renders).
 */
function stripUnserializable(value: unknown): unknown {
  if (typeof File !== 'undefined' && value instanceof File) return undefined
  if (typeof Blob !== 'undefined' && value instanceof Blob) return undefined
  if (typeof FileList !== 'undefined' && value instanceof FileList)
    return undefined
  if (Array.isArray(value)) return value.map(stripUnserializable)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        stripUnserializable(v),
      ])
    )
  }
  return value
}

export function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  initialData?: Partial<T>
) {
  const [draft, setDraft] = useState<Partial<T>>(() => {
    if (typeof window === 'undefined') return initialData || {}

    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const metadata: DraftMetadata<T> = JSON.parse(saved)
        // Check if draft is not expired (7 days)
        const now = Date.now()
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        if (now - metadata.timestamp < sevenDays) {
          return metadata.data
        } else {
          // Expired draft, remove it
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      logger.error('Error loading draft', {
        error: error instanceof Error ? error : String(error),
      })
    }

    return initialData || {}
  })

  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Auto-save with debounce (1s)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const timeout = setTimeout(() => {
      try {
        const metadata: DraftMetadata<T> = {
          timestamp: Date.now(),
          formId: key,
          data: stripUnserializable(draft) as Partial<T>,
        }
        localStorage.setItem(key, JSON.stringify(metadata))
        setLastSaved(new Date())
      } catch (error) {
        logger.error('Error saving draft', {
          error: error instanceof Error ? error : String(error),
        })
      }
    }, 1000)

    return () => clearTimeout(timeout)
  }, [draft, key])

  const clearDraft = () => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(key)
      setDraft(initialData || {})
      setLastSaved(null)
    } catch (error) {
      logger.error('Error clearing draft', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  // Stable identities: consumers use these as effect deps (WizardForm).
  const updateDraft = useCallback((updates: Partial<T>) => {
    setDraft(prev => ({ ...prev, ...updates }))
  }, [])

  const hasDraft = useCallback(() => {
    if (typeof window === 'undefined') return false

    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const metadata: DraftMetadata<T> = JSON.parse(saved)
        const now = Date.now()
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        return now - metadata.timestamp < sevenDays
      }
    } catch (error) {
      logger.error('Error checking draft', {
        error: error instanceof Error ? error : String(error),
      })
    }

    return false
  }, [key])

  return {
    draft,
    setDraft,
    updateDraft,
    clearDraft,
    hasDraft,
    lastSaved,
  }
}
