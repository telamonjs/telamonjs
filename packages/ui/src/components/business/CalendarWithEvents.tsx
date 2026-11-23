'use client'

import { useState, useMemo } from 'react'
import { cn } from '../../utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { useTelamonjsT } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

/**
 * Calendar event
 */
export interface CalendarEvent {
  id: string
  title: string
  date: Date
  color?: string
  allDay?: boolean
  description?: string
}

/**
 * CalendarWithEvents props
 */
export interface CalendarWithEventsProps {
  events: CalendarEvent[]
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  className?: string
  defaultDate?: Date
  /**
   * Called with the first day of the newly shown month whenever the user
   * navigates (previous/next/today) — fetch that month's events here. Not
   * called on mount: load the `defaultDate` month yourself
   */
  onMonthChange?: (month: Date) => void
}

/**
 * CalendarWithEvents - Calendar with events and navigation
 *
 * @example
 * ```tsx
 * <CalendarWithEvents
 *   events={[
 *     {
 *       id: '1',
 *       title: 'Meeting',
 *       date: new Date(),
 *       color: 'blue'
 *     }
 *   ]}
 *   onDateClick={(date) => console.log('Clicked:', date)}
 * />
 * ```
 */
export function CalendarWithEvents({
  events,
  onDateClick,
  onEventClick,
  className,
  defaultDate = new Date(),
  onMonthChange,
}: CalendarWithEventsProps) {
  const t = useTelamonjsT()
  const dateFnsLocale = useDateFnsLocale()
  const [currentMonth, setCurrentMonth] = useState(defaultDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { locale: dateFnsLocale })
  const calendarEnd = endOfWeek(monthEnd, { locale: dateFnsLocale })

  const days = useMemo(() => {
    const daysArray: Date[] = []
    let day = calendarStart

    while (day <= calendarEnd) {
      daysArray.push(day)
      day = addDays(day, 1)
    }

    return daysArray
  }, [calendarStart, calendarEnd])

  // First 7 days of the grid are the weekday header (calendarStart = start of week).
  const weekdayLabels = useMemo(
    () => days.slice(0, 7).map(day => format(day, 'EEEEEE', { locale: dateFnsLocale })),
    [days, dateFnsLocale]
  )

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date))
  }

  const goToMonth = (month: Date) => {
    setCurrentMonth(month)
    // "Today" while already on this month changes nothing — no refetch.
    if (!isSameMonth(month, currentMonth)) onMonthChange?.(startOfMonth(month))
  }

  const handlePrevMonth = () => goToMonth(subMonths(currentMonth, 1))

  const handleNextMonth = () => goToMonth(addMonths(currentMonth, 1))

  const handleToday = () => goToMonth(new Date())

  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-xl'>
            {format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
          </CardTitle>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleToday}
              data-testid='calendar-today-button'
            >
              {t('common.today')}
            </Button>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                onClick={handlePrevMonth}
                aria-label={t('business.calendar.prevMonth')}
              >
                <ChevronLeft className='w-4 h-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                onClick={handleNextMonth}
                aria-label={t('business.calendar.nextMonth')}
              >
                <ChevronRight className='w-4 h-4' />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden'>
          {/* Weekday header */}
          {weekdayLabels.map((day, index) => (
            <div
              key={`${day}-${index}`}
              className='bg-muted p-2 text-center text-sm font-semibold'
            >
              {day}
            </div>
          ))}

          {/* Calendar cells */}
          {days.map(day => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isCurrentDay = isToday(day)

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDateClick?.(day)}
                className={cn(
                  'bg-background min-h-[80px] p-2 cursor-pointer hover:bg-accent transition-colors',
                  !isCurrentMonth && 'text-muted-foreground bg-muted/50',
                  isCurrentDay && 'bg-primary/10'
                )}
              >
                <div className='flex items-center justify-between mb-1'>
                  <span
                    className={cn(
                      'text-sm',
                      isCurrentDay &&
                        'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-semibold'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <Badge variant='secondary' className='text-xs h-5'>
                      {dayEvents.length}
                    </Badge>
                  )}
                </div>

                <div className='space-y-1'>
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      onClick={e => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className={cn(
                        'text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity',
                        event.color
                          ? `bg-${event.color}-100 text-${event.color}-800`
                          : 'bg-primary/20 text-primary'
                      )}
                      style={
                        event.color
                          ? {
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                            }
                          : undefined
                      }
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className='text-xs text-muted-foreground text-center'>
                      {t('business.calendar.more', {
                        count: dayEvents.length - 2,
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
