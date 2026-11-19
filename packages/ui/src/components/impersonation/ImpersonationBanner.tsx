'use client'

import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'
import { Button } from '../../ui/button'
import { cn } from '../../utils'

export interface ImpersonationBannerProps {
  /** When `false`/absent the banner renders nothing. */
  isImpersonating?: boolean
  /** Name of the user being impersonated (the current session). */
  currentUserName?: string
  /** Name of the real user, who "Back to original" returns to. */
  originalUserName?: string
  /** Ends the impersonation. Without a callback the button isn't rendered. */
  onStop?: () => void
  /** Disables the button and shows "Returning...". */
  isPending?: boolean
  className?: string
}

/**
 * ImpersonationBanner — persistent high-contrast bar shown while the
 * session is impersonating another user.
 *
 * Exists because, until 6.5.0, the only clue of impersonation was a hidden
 * item in the sidebar footer dropdown — in practice people would forget
 * they were impersonating and leave the session open. The banner is
 * `role="status"` (aria-live polite) so screen readers announce it when it
 * appears.
 *
 * Deliberately generic: takes only names and a callback, with no coupling
 * to any app's session shape.
 *
 * @example
 * ```tsx
 * <ImpersonationBanner
 *   isImpersonating={session.isImpersonating}
 *   currentUserName={session.user?.name}
 *   originalUserName={session.originalUser?.name}
 *   onStop={stop}
 *   isPending={isPending}
 * />
 * ```
 */
export function ImpersonationBanner({
  isImpersonating,
  currentUserName,
  originalUserName,
  onStop,
  isPending = false,
  className,
}: ImpersonationBannerProps) {
  const t = useTelamonjsT()
  if (!isImpersonating) return null

  return (
    <div
      role='status'
      data-testid='impersonation-banner'
      className={cn(
        'flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2',
        'border-b-2 border-amber-600 bg-amber-300 px-4 py-2 text-amber-950',
        // The mobile menu's floating trigger sits at `left-4 top-4` (md:hidden);
        // without this padding it would cover the start of the text.
        'pl-14 md:pl-4',
        className
      )}
    >
      <p className='flex min-w-0 items-center gap-2 text-sm leading-snug'>
        <AlertTriangle
          aria-hidden='true'
          className='h-4 w-4 shrink-0 text-amber-900'
        />
        <span className='min-w-0'>
          <span className='font-bold uppercase tracking-wide'>
            {t('impersonation.bannerLabel')}
          </span>{' '}
          {originalUserName
            ? t.rich('impersonation.actingAsWithOriginal', {
                name: currentUserName ?? t('impersonation.unknownUser'),
                original: originalUserName,
                strong: chunks => (
                  <strong className='font-semibold'>{chunks}</strong>
                ),
              })
            : t.rich('impersonation.actingAs', {
                name: currentUserName ?? t('impersonation.unknownUser'),
                strong: chunks => (
                  <strong className='font-semibold'>{chunks}</strong>
                ),
              })}
        </span>
      </p>

      {onStop && (
        <Button
          type='button'
          size='sm'
          data-testid='impersonation-banner-stop'
          onClick={onStop}
          disabled={isPending}
          className={cn(
            'shrink-0 bg-amber-950 text-amber-50 hover:bg-amber-900',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-950 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-300'
          )}
        >
          {isPending ? (
            <Loader2 aria-hidden='true' className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <RotateCcw aria-hidden='true' className='mr-2 h-4 w-4' />
          )}
          {isPending
            ? t('impersonation.returning')
            : originalUserName
              ? t('impersonation.backTo', { name: originalUserName })
              : t('impersonation.backToGeneric')}
        </Button>
      )}
    </div>
  )
}
