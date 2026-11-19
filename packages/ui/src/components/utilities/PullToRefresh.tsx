'use client'

import React, { useState, useRef, ReactNode } from 'react'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { cn } from '../../utils'
import { useTelamonjsT } from '../../i18n/use-t'

type RefreshStatus = 'idle' | 'pulling' | 'ready' | 'refreshing'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: ReactNode
  enabled?: boolean
  threshold?: number
  className?: string
}

const PULL_THRESHOLD = 80 // pixels to trigger refresh
const MAX_PULL = 120 // maximum pull distance

/**
 * Pull-to-refresh component for mobile
 * Wraps content and enables pull gesture to refresh data
 */
export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  threshold = PULL_THRESHOLD,
  className,
}: PullToRefreshProps) {
  const t = useTelamonjsT()
  const [status, setStatus] = useState<RefreshStatus>('idle')
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  if (!enabled) {
    return <>{children}</>
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start pull if we're at the top of the scroll container
    const container = containerRef.current
    if (!container) return

    const scrollTop = container.scrollTop
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || status === 'refreshing') return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    // Only pull down
    if (diff > 0) {
      // Prevent default scroll behavior
      e.preventDefault()

      // Calculate pull distance with resistance
      const distance = Math.min(diff * 0.5, MAX_PULL)
      setPullDistance(distance)

      // Update status based on distance
      if (distance >= threshold) {
        setStatus('ready')
      } else {
        setStatus('pulling')
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.current) return

    isPulling.current = false

    if (pullDistance >= threshold && status === 'ready') {
      // Trigger refresh
      setStatus('refreshing')
      setPullDistance(threshold) // Lock at threshold

      try {
        await Promise.resolve(onRefresh())
      } finally {
        // Reset
        setStatus('idle')
        setPullDistance(0)
      }
    } else {
      // Cancel
      setStatus('idle')
      setPullDistance(0)
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pulling':
        return t('data.pullToRefresh')
      case 'ready':
        return t('data.releaseToRefresh')
      case 'refreshing':
        return t('data.refreshing')
      default:
        return ''
    }
  }

  const getIndicatorIcon = () => {
    if (status === 'refreshing') {
      return <RefreshCw className='h-5 w-5 animate-spin text-primary' />
    }

    return (
      <ChevronDown
        className={cn(
          'h-5 w-5 text-muted-foreground transition-transform',
          status === 'ready' && 'rotate-180 text-primary'
        )}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-y-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className='absolute top-0 left-0 right-0 flex flex-col items-center justify-center overflow-hidden bg-background/95 backdrop-blur-sm z-10 transition-[opacity,height] duration-150 motion-reduce:transition-none'
        style={{
          opacity: status === 'idle' ? 0 : 1,
          height: status === 'idle' ? 0 : pullDistance,
        }}
      >
        <div className='flex flex-col items-center gap-1 pb-2'>
          {getIndicatorIcon()}
          <span className='text-xs text-muted-foreground font-medium'>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Content with transform based on pull distance */}
      <div
        className='transition-transform duration-150 motion-reduce:transition-none'
        style={{
          transform: `translateY(${status === 'idle' ? 0 : pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
