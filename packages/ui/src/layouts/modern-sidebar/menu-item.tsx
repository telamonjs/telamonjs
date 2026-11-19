'use client'

import { memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getIcon } from '../../utils/icon'
import { cn } from '../../utils'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui/tooltip'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { SingleMenuItem } from '../../types/menu'

/**
 * MenuItemComponent - single sidebar menu item (leaf).
 *
 * `memo`-wrapped: relies on the caller passing stable `onNavigate` identity
 * (a `useCallback` in the ModernSidebar orchestrator) to avoid re-rendering
 * every item on unrelated sidebar state changes.
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
export const MenuItemComponent = memo(function MenuItemComponent({
  item,
  isActive,
  isCompact,
  onNavigate,
}: {
  item: SingleMenuItem
  isActive: boolean
  isCompact: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()
  const t = useTelamonjsT()
  const text = useText()
  const title = text(item.title)
  const description = text(item.description)

  const handleClick = useCallback(() => {
    router.push(item.href)
    onNavigate?.()
  }, [router, item.href, onNavigate])

  // Disabled items: inert div, no click, no navigation
  if (item.isDisabled) {
    const IconComponent = item.icon
      ? typeof item.icon === 'string'
        ? getIcon(item.icon as string)
        : item.icon
      : null

    const disabledContent = (
      <div
        className={cn(
          'flex h-10 w-full items-center gap-3 rounded-md opacity-40 cursor-default select-none pointer-events-none',
          isCompact ? 'justify-center px-2' : 'px-3'
        )}
        aria-disabled='true'
      >
        {IconComponent && (
          <IconComponent className='h-5 w-5 shrink-0 text-sidebar-foreground/40' />
        )}
        {!isCompact && (
          <span className='truncate text-sm text-sidebar-foreground/40'>
            {title}
          </span>
        )}
      </div>
    )

    if (isCompact && title) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{disabledContent}</TooltipTrigger>
          <TooltipContent side='right' sideOffset={8}>
            <span className='text-muted-foreground'>
              {t('navigation.itemDisabled', { title: title ?? '' })}
            </span>
          </TooltipContent>
        </Tooltip>
      )
    }

    return disabledContent
  }

  const content = (
    <Button
      variant='ghost'
      size={isCompact ? 'icon' : 'sm'}
      data-testid={`menu-item-${item.id}`}
      className={cn(
        'h-10 w-full justify-start gap-3 transition-all',
        isCompact ? 'px-2' : 'px-3',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isActive &&
          'border-l-2 border-primary bg-gradient-to-r from-[hsl(var(--sidebar-active-from,var(--primary)/10))] to-[hsl(var(--sidebar-active-to,var(--sidebar-background)))] font-medium text-sidebar-accent-foreground',
        !isActive && 'text-sidebar-foreground'
      )}
      onClick={handleClick}
    >
      {item.icon &&
        (() => {
          const IconComponent =
            typeof item.icon === 'string'
              ? getIcon(item.icon as string)
              : item.icon
          return (
            <IconComponent
              className={cn(
                'h-5 w-5 shrink-0',
                isActive ? 'text-primary' : 'text-sidebar-foreground opacity-70'
              )}
            />
          )
        })()}

      {!isCompact && (
        <>
          <span className='truncate text-sm'>{title}</span>
          <div className='ml-auto flex items-center gap-1'>
            {item.isFavorite && (
              <div className='h-3 w-3 text-yellow-500'>⭐</div>
            )}
            {item.isNew && (
              <Badge variant='secondary' className='px-1 py-0 text-xs'>
                {t('common.create')}
              </Badge>
            )}
            {item.isBeta && (
              <Badge variant='outline' className='px-1 py-0 text-xs'>
                {t('navigation.beta')}
              </Badge>
            )}
            {item.badge && (
              <Badge variant='secondary' className='px-1 py-0 text-xs'>
                {item.badge}
              </Badge>
            )}
          </div>
        </>
      )}
    </Button>
  )

  if (isCompact && title) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side='right' sideOffset={8}>
          <div className='flex flex-col gap-1'>
            <span className='font-medium'>{title}</span>
            {description && (
              <span className='text-xs text-muted-foreground'>
                {description}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
})
