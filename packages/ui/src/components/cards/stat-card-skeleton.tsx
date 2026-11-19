import { cn } from '../../utils/cn'
import type { StatCardSkeletonProps } from './types'

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function TintedSkeleton({ size }: { size: 'mini' | 'compact' | 'default' }) {
  const isMini = size === 'mini'
  const isCompact = size === 'compact' || isMini
  return (
    <div
      className={cn(
        'border border-border bg-muted/30',
        isMini
          ? 'rounded-md px-1.5 py-1'
          : isCompact
            ? 'rounded-lg p-2'
            : 'rounded-lg p-3'
      )}
    >
      <div
        className={cn(
          'flex items-center',
          isMini ? 'gap-1' : isCompact ? 'gap-1.5' : 'gap-2'
        )}
      >
        <SkeletonPulse
          className={cn(
            'shrink-0 rounded-md',
            isMini ? 'h-4 w-4' : isCompact ? 'h-6 w-6' : 'h-7 w-7'
          )}
        />
        <div className='space-y-1'>
          <SkeletonPulse
            className={cn(
              isMini ? 'h-3 w-6' : isCompact ? 'h-4 w-8' : 'h-5 w-10'
            )}
          />
          <SkeletonPulse className={cn(isMini ? 'h-2 w-10' : 'h-2.5 w-14')} />
        </div>
      </div>
    </div>
  )
}

function OutlinedSkeleton() {
  return (
    <div className='rounded-xl bg-card border border-border px-3 py-2'>
      <div className='flex items-center gap-2.5'>
        <SkeletonPulse className='h-9 w-9 rounded-full shrink-0' />
        <div className='flex-1 space-y-1'>
          <SkeletonPulse className='h-3 w-16' />
          <SkeletonPulse className='h-5 w-10' />
        </div>
      </div>
    </div>
  )
}

function AccentSkeleton() {
  return (
    <div className='bg-card rounded-xl border-l-[3px] border-l-muted p-4 shadow-sm'>
      <div className='flex items-center gap-4'>
        <SkeletonPulse className='h-12 w-12 rounded-xl shrink-0' />
        <div className='flex-1 space-y-2'>
          <SkeletonPulse className='h-7 w-16' />
          <SkeletonPulse className='h-4 w-24' />
        </div>
      </div>
    </div>
  )
}

export function StatCardSkeleton({
  count = 1,
  variant = 'outlined',
  size = 'default',
  className,
}: StatCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={className}>
          {variant === 'tinted' && <TintedSkeleton size={size} />}
          {variant === 'outlined' && <OutlinedSkeleton />}
          {variant === 'accent' && <AccentSkeleton />}
        </div>
      ))}
    </>
  )
}
