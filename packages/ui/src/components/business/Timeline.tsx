'use client'

import React from 'react'
import { cn } from '../../utils'
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

/**
 * Timeline item
 */
export interface TimelineItem {
  id: string
  title: string
  description?: string
  timestamp: Date
  user?: {
    name: string
    avatar?: string
  }
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}

/**
 * Timeline props
 */
export interface TimelineProps {
  items: TimelineItem[]
  variant?: 'vertical' | 'horizontal'
  showConnector?: boolean
  className?: string
}

const variantStyles = {
  default: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

const variantBorderStyles = {
  default: 'border-blue-200',
  success: 'border-green-200',
  warning: 'border-yellow-200',
  error: 'border-red-200',
}

/**
 * Timeline - Component for displaying a timeline of events
 *
 * @example
 * ```tsx
 * <Timeline
 *   items={[
 *     {
 *       id: '1',
 *       title: 'Order created',
 *       description: 'Order #1234 was created',
 *       timestamp: new Date(),
 *       user: { name: 'John Smith', avatar: '/avatar.jpg' },
 *       variant: 'success'
 *     }
 *   ]}
 * />
 * ```
 */
export function Timeline({
  items,
  variant = 'vertical',
  showConnector = true,
  className,
}: TimelineProps) {
  const dateFnsLocale = useDateFnsLocale()
  if (variant === 'horizontal') {
    return (
      <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
        {items.map((item, index) => (
          <div key={item.id} className='flex items-start gap-2 min-w-[200px]'>
            <div className='flex flex-col items-center'>
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0',
                  variantStyles[item.variant || 'default']
                )}
              >
                {item.icon || (
                  <span className='text-sm font-semibold'>{index + 1}</span>
                )}
              </div>
              {showConnector && index < items.length - 1 && (
                <div
                  className={cn(
                    'h-1 w-20 mt-2',
                    variantStyles[item.variant || 'default']
                  )}
                />
              )}
            </div>
            <div className='flex-1'>
              <h4 className='font-semibold text-sm'>{item.title}</h4>
              {item.description && (
                <p className='text-xs text-muted-foreground mt-1'>
                  {item.description}
                </p>
              )}
              <time className='text-xs text-muted-foreground mt-1 block'>
                {formatDistanceToNow(item.timestamp, {
                  addSuffix: true,
                  locale: dateFnsLocale,
                })}
              </time>
              {item.user && (
                <div className='flex items-center gap-2 mt-2'>
                  <Avatar className='w-6 h-6'>
                    <AvatarImage src={item.user.avatar} alt={item.user.name} />
                    <AvatarFallback className='text-xs'>
                      {item.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className='text-xs text-muted-foreground'>
                    {item.user.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, index) => (
        <div key={item.id} className='flex gap-4'>
          <div className='flex flex-col items-center'>
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0',
                variantStyles[item.variant || 'default']
              )}
            >
              {item.icon || (
                <span className='text-sm font-semibold'>{index + 1}</span>
              )}
            </div>
            {showConnector && index < items.length - 1 && (
              <div
                className={cn(
                  'w-0.5 h-full min-h-[40px] mt-2',
                  variantStyles[item.variant || 'default']
                )}
              />
            )}
          </div>
          <div className='flex-1 pb-4'>
            <div
              className={cn(
                'p-4 rounded-lg border-l-4',
                variantBorderStyles[item.variant || 'default']
              )}
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1'>
                  <h4 className='font-semibold'>{item.title}</h4>
                  {item.description && (
                    <p className='text-sm text-muted-foreground mt-1'>
                      {item.description}
                    </p>
                  )}
                </div>
                <time className='text-xs text-muted-foreground whitespace-nowrap'>
                  {formatDistanceToNow(item.timestamp, {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  })}
                </time>
              </div>
              {item.user && (
                <div className='flex items-center gap-2 mt-3'>
                  <Avatar className='w-6 h-6'>
                    <AvatarImage src={item.user.avatar} alt={item.user.name} />
                    <AvatarFallback className='text-xs'>
                      {item.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className='text-sm text-muted-foreground'>
                    {item.user.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
