'use client'

import { useCallback, useState } from 'react'
import { toast } from '../../hooks/use-toast'
import { logger } from '../../utils/logger'
import { useTelamonjsT } from '../../i18n/use-t'

export interface UseStopImpersonationResult {
  isPending: boolean
  stop: () => Promise<void>
}

/**
 * Shared "stop impersonation" state: guards against double-click,
 * success/error toast, and structured logging.
 *
 * Extracted from `ModernSidebar` (where it lived inline) so `AdminShell`
 * can feed `ImpersonationBanner` the same behavior, without duplicating
 * the logic in two places.
 *
 * @internal Not part of the public barrel.
 */
export function useStopImpersonation(
  onStopImpersonation?: () => Promise<void>,
  scope = 'Impersonation'
): UseStopImpersonationResult {
  const t = useTelamonjsT()
  const [isPending, setIsPending] = useState(false)

  const stop = useCallback(async () => {
    if (!onStopImpersonation || isPending) return

    setIsPending(true)
    try {
      await onStopImpersonation()
      toast({
        title: t('common.success'),
        description: t('impersonation.stopSuccessDescription'),
      })
    } catch (error) {
      logger.error(`[${scope}] Error stopping impersonation`, {
        error: error instanceof Error ? error : String(error),
      })
      toast({
        title: t('common.error'),
        description: t('impersonation.stopErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setIsPending(false)
    }
  }, [onStopImpersonation, isPending, scope, t])

  return { isPending, stop }
}
