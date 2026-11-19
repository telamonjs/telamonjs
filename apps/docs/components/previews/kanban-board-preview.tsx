'use client'

import { useState } from 'react'
import { KanbanBoard, type KanbanColumn } from '@telamonjs/ui'
import { ComponentPreview } from '../component-preview'

const initialColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: '#3b82f6',
    cards: [
      {
        id: 'card-1',
        title: 'Design login page',
        description: 'New auth flow mockups',
        priority: 'high',
        assignee: { name: 'Ana Lima' },
        tags: ['design'],
      },
      {
        id: 'card-2',
        title: 'Update dependencies',
        priority: 'low',
        assignee: { name: 'Bruno Reis' },
      },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: '#f59e0b',
    limit: 3,
    cards: [
      {
        id: 'card-3',
        title: 'Orders API pagination',
        description: 'Cursor-based pagination',
        priority: 'medium',
        assignee: { name: 'Carla Souza' },
        tags: ['backend'],
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: '#10b981',
    cards: [
      {
        id: 'card-4',
        title: 'Fix CSV export encoding',
        priority: 'medium',
        assignee: { name: 'Diego Alves' },
      },
    ],
  },
]

const CODE = `import { KanbanBoard, type KanbanColumn } from '@telamonjs/ui'

const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns)

function handleCardMove(cardId: string, fromColumn: string, toColumn: string) {
  setColumns(cols => {
    const card = cols
      .find(c => c.id === fromColumn)
      ?.cards.find(c => c.id === cardId)
    if (!card) return cols
    return cols.map(col => {
      if (col.id === fromColumn)
        return { ...col, cards: col.cards.filter(c => c.id !== cardId) }
      if (col.id === toColumn) return { ...col, cards: [...col.cards, card] }
      return col
    })
  })
}

<KanbanBoard columns={columns} onCardMove={handleCardMove} />`

export function KanbanBoardPreview() {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns)

  function handleCardMove(cardId: string, fromColumn: string, toColumn: string) {
    setColumns(cols => {
      const card = cols
        .find(c => c.id === fromColumn)
        ?.cards.find(c => c.id === cardId)
      if (!card) return cols
      return cols.map(col => {
        if (col.id === fromColumn)
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) }
        if (col.id === toColumn) return { ...col, cards: [...col.cards, card] }
        return col
      })
    })
  }

  return (
    <ComponentPreview code={CODE}>
      <div className='w-full overflow-x-auto text-left'>
        <KanbanBoard columns={columns} onCardMove={handleCardMove} />
      </div>
    </ComponentPreview>
  )
}
