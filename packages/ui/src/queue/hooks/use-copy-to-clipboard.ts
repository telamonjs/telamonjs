'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useTelamonjsT } from '../../i18n/use-t'

/**
 * Copies text to the clipboard with a 2s "copied" feedback.
 * `copied` holds the `key` (or the `text` itself when `key` is not given)
 * of the last successfully copied item.
 *
 * @example
 * ```tsx
 * const { copied, copy } = useCopyToClipboard()
 * <Button onClick={() => copy(job.id, 'job-id')}>
 *   {copied === 'job-id' ? 'Copiado!' : 'Copiar ID'}
 * </Button>
 * ```
 */
export function useCopyToClipboard() {
  const t = useTelamonjsT()
  const [copied, setCopied] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const copy = useCallback(async (text: string, key?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    try {
      await navigator.clipboard.writeText(text)
      setCopied(key ?? text)
      timerRef.current = setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.warn('[useCopyToClipboard] copy failed:', err)
      toast.error(t('queue.clipboard.copyError'))
    }
  }, [t])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCopied(null)
  }, [])

  return { copied, copy, reset }
}
