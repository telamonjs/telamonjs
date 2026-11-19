import type { MessagesShape } from '../shape'
import type { pickers as base } from '../pt-BR/pickers'

export const pickers = {
  last7Days: 'Últimos 7 días',
  last30Days: 'Últimos 30 días',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  prevMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  selectTitle: 'Seleccionar',
  timeLabel: 'Hora',
  start: 'Inicio',
  end: 'Fin',
  now: 'Ahora',
  periods: 'Períodos',
} satisfies MessagesShape<typeof base>
