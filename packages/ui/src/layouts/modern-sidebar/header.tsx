'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils'
import { Button } from '../../ui/button'
import { useTelamonjsT } from '../../i18n/use-t'

export interface SidebarHeaderProps {
  isCompact: boolean
  compactLogoUrl?: string
  logoUrl: string
  systemName: string
  logoClassName?: string
  buildLogoStyles: (isCompact: boolean) => CSSProperties
  resetToHome: () => void
  toggleSidebar: () => void
}

/**
 * SidebarHeader - desktop logo header + the floating collapse/expand button.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
export function SidebarHeader({
  isCompact,
  compactLogoUrl,
  logoUrl,
  systemName,
  logoClassName,
  buildLogoStyles,
  resetToHome,
  toggleSidebar,
}: SidebarHeaderProps) {
  const t = useTelamonjsT()
  return (
    <>
      {/* Header */}
      <div
        className={cn(
          'sticky top-0 flex h-[65px] items-center justify-center border-b border-sidebar-border shadow-sm',
          'bg-[hsl(var(--sidebar-header-bg,var(--sidebar-background)))]',
          isCompact ? 'px-2' : 'px-6'
        )}
      >
        <Link
          href='/admin'
          onClick={resetToHome}
          className='flex items-center gap-2 transition-opacity hover:opacity-80'
        >
          {isCompact && compactLogoUrl ? (
            <img
              src={compactLogoUrl}
              alt={systemName}
              className={cn('h-8 w-8', logoClassName)}
              style={buildLogoStyles(true)}
            />
          ) : (
            <img
              src={logoUrl}
              alt={systemName}
              className={cn('h-10 w-auto', logoClassName)}
              style={buildLogoStyles(false)}
            />
          )}
        </Link>
      </div>

      {/* Collapse button - floating external */}
      <div className='relative'>
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleSidebar}
          aria-label={isCompact ? t('shell.expand') : t('shell.collapse')}
          className='absolute -right-3 top-3 h-6 w-6 rounded-md border border-border bg-card/90 shadow-md backdrop-blur-sm hover:bg-muted/80'
        >
          {isCompact ? (
            <ChevronRight className='h-3 w-3' />
          ) : (
            <ChevronLeft className='h-3 w-3' />
          )}
        </Button>
      </div>
    </>
  )
}
