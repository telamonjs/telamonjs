'use client'

/**
 * SemanticField - Consistent label/value display for detail views
 *
 * Used inside SemanticCard to display entity attributes.
 */

import { cn } from '../../utils/cn'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

export interface SemanticFieldProps {
  label: I18nText
  value: string | number | null | undefined
  icon?: React.ComponentType<{ className?: string }>
  mono?: boolean
  className?: string
}

export function SemanticField({
  label,
  value,
  icon: Icon,
  mono,
  className,
}: SemanticFieldProps) {
  const text = useText()
  const displayValue =
    value === null || value === undefined || value === '' ? '-' : String(value)

  return (
    <div className={cn(className)}>
      <label className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
        {Icon && <Icon className='h-3 w-3' />}
        {text(label)}
      </label>
      <p
        className={cn(
          'text-sm font-semibold text-foreground',
          mono && 'font-mono'
        )}
      >
        {displayValue}
      </p>
    </div>
  )
}

