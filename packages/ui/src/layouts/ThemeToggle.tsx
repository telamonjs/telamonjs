'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTelamonjsT } from '../i18n/use-t'
import { Button } from '../ui/button'
import { cn } from '../utils'

export interface ThemeToggleProps {
  className?: string
}

/**
 * Light/dark switch for the header. Drives the next-themes provider that
 * `AppProviders` mounts (same instance as the exported `useTheme`), so the
 * choice persists in `localStorage` and the first visit follows
 * `prefers-color-scheme` when `enableSystem` is on.
 *
 * Both icons are always rendered and the `dark` class on `<html>` (applied by
 * next-themes before paint) shows one, so server and client HTML match: no
 * mounted-state placeholder, no hydration warning.
 *
 * @example
 * ```tsx
 * <AdminShell menuConfig={menuConfig} themeToggle>{children}</AdminShell>
 * // or anywhere else
 * <ThemeToggle />
 * ```
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTelamonjsT()
  const label = t('shell.toggleTheme')

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      aria-label={label}
      title={label}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn('text-muted-foreground hover:text-foreground', className)}
    >
      <Sun className='h-5 w-5 dark:hidden' aria-hidden='true' />
      <Moon className='hidden h-5 w-5 dark:block' aria-hidden='true' />
    </Button>
  )
}
