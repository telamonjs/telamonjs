'use client'

import { Inbox, Plus } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'
import { Button } from '../../ui/button'
import { cn } from '../../utils'
import type { HeadingLevel } from '../../ui/heading-level'

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  /** Semantic level of the title (default 2: the state is the page's main content). Visual size is unchanged. */
  headingLevel?: HeadingLevel
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const
  const t = useTelamonjsT()
  const resolvedTitle = title ?? t('list.emptyItems')
  const resolvedDescription = description ?? t('list.emptyItemsDescription')
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        className
      )}
    >
      {/* Animated Icon Container */}
      <div className='animate-in fade-in-0 zoom-in-90 duration-300 motion-reduce:animate-none'>
        <div className='relative'>
          {/* Gradient Blur Background */}
          <div className='absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-xl scale-150' />

          {/* Icon Circle */}
          <div className='relative flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 border border-border/50 backdrop-blur-sm'>
            {icon || <Inbox className='h-7 w-7 text-muted-foreground/70' />}
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className='text-center mt-4 space-y-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-backwards delay-100 motion-reduce:animate-none'>
        <Heading className='text-sm font-semibold text-foreground'>
          {resolvedTitle}
        </Heading>
        <p className='text-sm text-muted-foreground max-w-[200px]'>
          {resolvedDescription}
        </p>
      </div>

      {/* Action Button */}
      {action && (
        <div className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-backwards delay-200 motion-reduce:animate-none'>
          <Button
            type='button'
            size='sm'
            onClick={action.onClick}
            className='mt-5 gap-1.5 shadow-sm hover:shadow-md transition-shadow'
            data-testid='empty-state-action-button'
          >
            <Plus className='h-4 w-4' />
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
