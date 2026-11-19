import type { Meta, StoryObj } from '@storybook/react'
import { CalendarWithEvents } from './CalendarWithEvents'

const meta = {
  title: 'Business/CalendarWithEvents',
  component: CalendarWithEvents,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Componente de calendário com suporte a eventos, agendamentos e visualizações múltiplas.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CalendarWithEvents>

export default meta
type Story = StoryObj<typeof meta>

const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const nextWeek = new Date(today)
nextWeek.setDate(nextWeek.getDate() + 7)

const sampleEvents = [
  {
    id: '1',
    title: 'Reunião com cliente',
    date: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      14,
      0
    ),
    color: '#3b82f6',
    description: 'Apresentação do projeto',
  },
  {
    id: '2',
    title: 'Code Review',
    date: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      10,
      30
    ),
    color: '#10b981',
  },
  {
    id: '3',
    title: 'Prazo de entrega',
    date: new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate()
    ),
    color: '#ef4444',
    allDay: true,
  },
  {
    id: '4',
    title: 'Sprint Planning',
    date: new Date(
      nextWeek.getFullYear(),
      nextWeek.getMonth(),
      nextWeek.getDate(),
      9,
      0
    ),
    color: '#8b5cf6',
    description: 'Planejamento da próxima sprint',
  },
  {
    id: '5',
    title: 'Almoço com equipe',
    date: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 2,
      12,
      0
    ),
    color: '#f59e0b',
  },
]

export const MonthView: Story = {
  args: {
    events: sampleEvents,
    onEventClick: event => {
      console.log('Evento clicado:', event)
    },
    onDateClick: date => {
      console.log('Data clicada:', date)
    },
  },
}

export const WeekView: Story = {
  args: {
    events: sampleEvents,
  },
}

export const DayView: Story = {
  args: {
    events: sampleEvents.filter(e => e.date.getDate() === today.getDate()),
  },
}

export const Empty: Story = {
  args: {
    events: [],
  },
}

export const WithMultipleEventTypes: Story = {
  args: {
    events: [
      ...sampleEvents,
      {
        id: '6',
        title: 'Férias - João',
        date: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 5
        ),
        color: '#06b6d4',
        allDay: true,
        description: 'Período de férias',
      },
      {
        id: '7',
        title: 'Release v2.0',
        date: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 14
        ),
        color: '#ec4899',
        allDay: true,
      },
    ],
  },
}

export const InteractiveCalendar: Story = {
  args: {
    events: sampleEvents,
    onEventClick: event => {
      alert(
        `Evento: ${event.title}\nInício: ${event.date.toLocaleString('pt-BR')}`
      )
    },
    onDateClick: date => {
      console.log('Adicionar evento em:', date)
    },
  },
}
