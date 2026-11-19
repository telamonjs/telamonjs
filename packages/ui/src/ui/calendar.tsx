'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { buttonVariants } from './button'
import { cn } from '../utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        // Layout
        months:
          'relative flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        // Nav FIXED at the top (aligned with the caption) — without the
        // absolute here the buttons center vertically in the container and
        // "float" depending on the month's number of weeks (4–6 rows)
        nav: 'absolute inset-x-0 top-0 z-10 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        // Grid
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex w-full',
        weekday:
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-2',
        // Day cell (td) — flex-1 stretches, button is fixed w-9 centered inside
        day: 'h-9 flex-1 flex items-center justify-center text-sm p-0 relative focus-within:relative focus-within:z-20',
        // Day button — fixed square, centered in cell
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        // Range highlighting (accent bg on td, primary button on start/end)
        range_start: 'bg-accent rounded-l-md',
        range_end: 'bg-accent rounded-r-md',
        range_middle: 'bg-accent',
        // Selected button (start/end of range, or single select)
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary [&>button]:focus:text-primary-foreground',
        // States
        today: '[&>button]:ring-1 [&>button]:ring-primary/30',
        outside: 'text-muted-foreground opacity-50 [&>button]:bg-transparent',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
