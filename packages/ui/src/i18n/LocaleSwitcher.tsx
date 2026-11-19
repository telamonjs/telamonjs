'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { cn } from '../utils'
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '../ui/dropdown-menu'
import { useTelamonjsT } from './use-t'
import { useTelamonjsI18n } from './context'
import { isTelamonjsLocale, type TelamonjsLocale } from './locales'
import { setLocaleCookie } from './locale-cookie'

export interface LocaleSwitcherProps {
  className?: string
  /** 'select' (default): native <select>, standalone. 'menu': radio items for inside a DropdownMenu. */
  variant?: 'select' | 'menu'
}

/** Renders nothing when only one locale is offered — nothing to switch to. */
export function LocaleSwitcher({ className, variant = 'select' }: LocaleSwitcherProps) {
  const t = useTelamonjsT()
  const router = useRouter()
  const { locales, onLocaleChange } = useTelamonjsI18n()
  const current = useLocale()

  if (locales.length < 2) return null

  const label: Record<TelamonjsLocale, string> = {
    'pt-BR': t('shell.locales.pt-BR'),
    en: t('shell.locales.en'),
    es: t('shell.locales.es'),
  }

  const handleChange = async (next: string) => {
    if (!isTelamonjsLocale(next)) return
    setLocaleCookie(next)
    await onLocaleChange?.(next)
    router.refresh()
  }

  if (variant === 'menu') {
    return (
      <DropdownMenuRadioGroup value={current} onValueChange={value => void handleChange(value)}>
        {locales.map(locale => (
          <DropdownMenuRadioItem key={locale} value={locale}>
            {label[locale]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    )
  }

  return (
    <select
      aria-label={t('shell.language')}
      className={cn(
        'h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
      value={current}
      onChange={e => void handleChange(e.target.value)}
    >
      {locales.map(locale => (
        <option key={locale} value={locale}>
          {label[locale]}
        </option>
      ))}
    </select>
  )
}
