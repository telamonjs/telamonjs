'use client'

import { memo } from 'react'
import { cn } from '../../utils/cn'
import { Button } from '../../ui/button'
import { useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'

export interface StatusOption {
  value: string
  /** Literal or `msg()` (I18nText) */
  label: I18nText
  dot?: string // dot color class (e.g. 'bg-green-500')
  activeClass?: string // active state class (e.g. 'text-green-700 bg-green-50')
}

export interface StatusFilterProps {
  options: StatusOption[]
  value: string
  onChange: (value: string) => void
  counts?: Record<string, number>
}

export const StatusFilter = memo(function StatusFilter({
  options,
  value,
  onChange,
  counts
}: StatusFilterProps) {
  const text = useText()
  return (
    <div className="inline-flex rounded-md shadow-sm h-8" role="group">
      {options.map((opt, idx) => {
        const isActive = value === opt.value
        const isFirst = idx === 0
        const isLast = idx === options.length - 1

        return (
          <Button
            key={opt.value}
            variant="outline"
            size="sm"
            onClick={() =>
              onChange(isActive && idx !== 0 ? options[0].value : opt.value)
            }
            className={cn(
              'h-8 rounded-none gap-1.5',
              isFirst && 'rounded-l-md',
              isLast && 'rounded-r-md',
              !isFirst && '-ml-px',
              isActive &&
                (opt.activeClass || 'text-foreground bg-muted/50 font-semibold')
            )}
            data-testid={`status-filter-${opt.value}`}
          >
            {opt.dot && (
              <span className={cn('h-2 w-2 rounded-full shrink-0', opt.dot)} />
            )}
            {text(opt.label)}
            {counts && opt.value in counts && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-semibold opacity-80">
                {counts[opt.value]}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
})

