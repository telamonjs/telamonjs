import type { Meta, StoryObj } from '@storybook/react'
import { KanbanBoard, KanbanCard } from './KanbanBoard'

const meta = {
  title: 'Business/KanbanBoard',
  component: KanbanBoard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Componente Kanban Board para gerenciamento visual de tarefas com drag-and-drop.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof KanbanBoard>

export default meta
type Story = StoryObj<typeof meta>

const initialColumns = [
  {
    id: 'backlog',
    title: 'Backlog',
    cards: [
      {
        id: '1',
        title: 'Implementar autenticação',
        description: 'Setup NextAuth.js v5',
        priority: 'high' as const,
        assignee: { name: 'João Silva' },
      },
      {
        id: '2',
        title: 'Criar página de dashboard',
        priority: 'medium' as const,
        assignee: { name: 'Maria Santos' },
      },
      {
        id: '3',
        title: 'Configurar CI/CD',
        description: 'GitHub Actions',
        priority: 'low' as const,
      },
    ] as KanbanCard[],
    color: 'gray',
  },
  {
    id: 'in-progress',
    title: 'Em Progresso',
    cards: [
      {
        id: '4',
        title: 'API de usuários',
        description: 'CRUD completo',
        priority: 'high' as const,
        assignee: { name: 'João Silva' },
      },
      {
        id: '5',
        title: 'Testes unitários',
        priority: 'medium' as const,
        assignee: { name: 'Pedro Costa' },
      },
    ] as KanbanCard[],
    color: 'blue',
    limit: 3,
  },
  {
    id: 'review',
    title: 'Em Revisão',
    cards: [
      {
        id: '6',
        title: 'Documentação API',
        priority: 'medium' as const,
        assignee: { name: 'Maria Santos' },
      },
    ] as KanbanCard[],
    color: 'yellow',
    limit: 2,
  },
  {
    id: 'done',
    title: 'Concluído',
    cards: [
      {
        id: '7',
        title: 'Setup inicial do projeto',
        priority: 'high' as const,
        assignee: { name: 'João Silva' },
      },
      {
        id: '8',
        title: 'Configuração ESLint',
        priority: 'low' as const,
      },
    ] as KanbanCard[],
    color: 'green',
  },
]

export const Default: Story = {
  args: {
    columns: initialColumns,
    onCardMove: (cardId, fromColumn, toColumn) => {
      console.log(`Mover ${cardId} de ${fromColumn} para ${toColumn}`)
    },
    onCardClick: card => {
      console.log('Card clicado:', card)
    },
  },
}

export const WithLimits: Story = {
  args: {
    columns: initialColumns.map(col => ({
      ...col,
      limit: col.id === 'in-progress' ? 2 : col.id === 'review' ? 1 : undefined,
    })),
    onCardMove: (cardId, from, to) => {
      console.log(`Move: ${cardId} (${from} → ${to})`)
    },
  },
}

export const Empty: Story = {
  args: {
    columns: [
      { id: 'todo', title: 'A Fazer', cards: [], color: 'gray' },
      { id: 'doing', title: 'Fazendo', cards: [], color: 'blue' },
      { id: 'done', title: 'Feito', cards: [], color: 'green' },
    ],
    onCardMove: (cardId, from, to) => {
      console.log(`Move: ${cardId} (${from} → ${to})`)
    },
  },
}
