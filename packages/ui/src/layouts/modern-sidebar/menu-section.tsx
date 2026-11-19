'use client'

import { memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getIcon } from '../../utils/icon'
import { cn } from '../../utils'
import { Button } from '../../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui/tooltip'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { GroupMenuItem } from '../../types/menu'

/**
 * MenuSectionComponent - sidebar menu group (drills into a sub-menu on click).
 *
 * `memo`-wrapped: relies on the caller passing a stable `onSectionClick`
 * identity (a `useCallback` in the ModernSidebar orchestrator).
 *
 * @internal Extracted from ModernSidebar during the god-component decomposition.
 */
export const MenuSectionComponent = memo(function MenuSectionComponent({
  item,
  isActive,
  isCompact,
  onSectionClick,
}: {
  item: GroupMenuItem
  isActive: boolean
  isCompact: boolean
  onSectionClick: (section: GroupMenuItem) => void
}) {
  const router = useRouter()
  const t = useTelamonjsT()
  const text = useText()
  const title = text(item.title)
  const description = text(item.description)

  const handleClick = useCallback(() => {
    if (item.href) {
      router.push(item.href)
    }
    onSectionClick(item)
  }, [router, item, onSectionClick])

  const content = (
    <Button
      variant='ghost'
      size={isCompact ? 'icon' : 'sm'}
      data-testid={`menu-section-${item.id}`}
      className={cn(
        'h-10 w-full gap-3 transition-all',
        isCompact ? 'px-2' : 'justify-between px-3',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isActive &&
          'border-l-2 border-primary bg-gradient-to-r from-[hsl(var(--sidebar-active-from,var(--primary)/10))] to-[hsl(var(--sidebar-active-to,var(--sidebar-background)))] font-medium text-sidebar-accent-foreground',
        !isActive && 'text-sidebar-foreground'
      )}
      onClick={handleClick}
    >
      <div className='flex items-center gap-3'>
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
                  isActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground opacity-70'
                )}
              />
            )
          })()}
        {!isCompact && <span className='truncate text-sm'>{title}</span>}
      </div>

      {!isCompact && (
        <ChevronRight className='h-4 w-4 transition-transform duration-200' />
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
            <div className='mt-1 text-xs text-muted-foreground'>
              {t('navigation.childrenCount', { count: item.children.length })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
})
