import type { MessagesShape } from '../shape'
import type { pickers as base } from '../pt-BR/pickers'

export const pickers = {
  last7Days: 'Last 7 days',
  last30Days: 'Last 30 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  selectTitle: 'Select',
  timeLabel: 'Time',
  start: 'Start',
  end: 'End',
  now: 'Now',
  periods: 'Periods',
} satisfies MessagesShape<typeof base>
