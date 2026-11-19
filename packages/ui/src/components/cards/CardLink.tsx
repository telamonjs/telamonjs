'use client'

import Link from 'next/link'
import { ReactElement, isValidElement, memo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { resolveNamedIcon, type IconName } from '../../utils/icon'
import { sanitizeSvg } from '../../utils/sanitize-html'
import { useTelamonjsT } from '../../i18n/use-t'

interface CardLinkIconProps {
  icon?: LucideIcon | ReactElement | string
  iconName?: IconName
  iconClassName: string
  svgWrapperClassName?: string
}

// memo: the icon resolves to a component reference at render time
// (getIconFromName lookup); the React Compiler can't prove that reference is
// stable, so it flags rendering it as "creating a component during render".
// Matches the existing quick-action-card.tsx pattern for the same situation.
const CardLinkIcon = memo(function CardLinkIcon({
  icon,
  iconName,
  iconClassName,
  svgWrapperClassName,
}: CardLinkIconProps) {
  const IconComponent = resolveNamedIcon(icon, iconName)
  if (IconComponent) {
    return <IconComponent className={iconClassName} />
  }
  if (typeof icon === 'string') {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(icon) }}
        className={svgWrapperClassName}
      />
    )
  }
  if (icon && isValidElement(icon)) {
    return <div className='text-2xl'>{icon}</div>
  }
  return null
})

interface CardLinkProps {
  href: string
  /**
   * Icon as a Lucide component (for Client Components).
   * Takes priority over iconName.
   */
  icon?: LucideIcon | ReactElement | string
  /**
   * Icon as a string name (for Server Components).
   * Use this when passing data from Server to Client Components.
   * @example iconName="ticket"
   */
  iconName?: IconName
  title: string
  disabled?: boolean
}

// memo: CardLink renders CardLinkIcon, whose own body resolves a component
// reference at render time (see comment above); the compiler traces that
// into any un-memoized caller and re-flags it here too.
export const CardLink = memo(function CardLink({
  href,
  icon,
  iconName,
  title,
  disabled,
}: CardLinkProps) {
  const t = useTelamonjsT()
  if (!disabled) {
    return (
      <Link
        href={href}
        passHref
        className='group relative overflow-hidden modern-card rounded-xl p-6 subtle-shadow
        hover:shadow-xl hover:-translate-y-1 transition-all duration-300'
      >
        <div className='flex flex-col items-center space-y-4 text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300'>
            <CardLinkIcon
              icon={icon}
              iconName={iconName}
              iconClassName='h-8 w-8'
              svgWrapperClassName='text-white'
            />
          </div>
          <div className='space-y-1'>
            <h3 className='font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-200'>
              {title}
            </h3>
            <p className='text-sm text-muted-foreground'>{t('dashboard.accessModule')}</p>
          </div>
        </div>
        <div className='absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/10 transition-all duration-300 rounded-xl' />
      </Link>
    )
  } else {
    return (
      <div className='relative overflow-hidden rounded-xl bg-muted p-6 subtle-shadow cursor-not-allowed opacity-60'>
        <div className='flex flex-col items-center space-y-4 text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground'>
            <CardLinkIcon icon={icon} iconName={iconName} iconClassName='h-8 w-8' />
          </div>
          <div className='space-y-1'>
            <h3 className='font-semibold text-muted-foreground'>{title}</h3>
            <p className='text-sm text-muted-foreground/60'>{t('dashboard.unavailable')}</p>
          </div>
        </div>
      </div>
    )
  }
})
