/**
 * PRD 068 item 3: only cards were drop targets — an empty column could not
 * receive a card, and dropping over a card reported the CARD id as `toColumn`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen } from '../../test/test-utils'
import { KanbanBoard, type KanbanColumn } from './KanbanBoard'

const dnd = vi.hoisted(() => ({
  onDragEnd: undefined as undefined | ((e: unknown) => void),
  droppables: new Map<string, HTMLElement | null>(),
}))

vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode
      onDragEnd: (e: unknown) => void
    }) => {
      dnd.onDragEnd = onDragEnd
      return <>{children}</>
    },
    useDroppable: ({ id }: { id: string }) => ({
      setNodeRef: (node: HTMLElement | null) => dnd.droppables.set(id, node),
      isOver: false,
    }),
  }
})

const columns: KanbanColumn[] = [
  { id: 'todo', title: 'A fazer', cards: [{ id: 'c1', title: 'Card 1' }] },
  { id: 'doing', title: 'Fazendo', cards: [{ id: 'c2', title: 'Card 2' }] },
  { id: 'done', title: 'Feito', cards: [] },
]

const drop = (active: string, over: string | null) =>
  dnd.onDragEnd?.({ active: { id: active }, over: over ? { id: over } : null })

beforeEach(() => dnd.droppables.clear())

describe('KanbanBoard', () => {
  describe('Rendering', () => {
    it('renders every column and card', () => {
      render(<KanbanBoard columns={columns} onCardMove={vi.fn()} />)
      expect(screen.getByText('Feito')).toBeInTheDocument()
      expect(screen.getByText('Card 2')).toBeInTheDocument()
    })

    it('each column body is a drop target, on the existing min-h container (no new ancestor)', () => {
      render(<KanbanBoard columns={columns} onCardMove={vi.fn()} />)
      expect([...dnd.droppables.keys()]).toEqual(['todo', 'doing', 'done'])
      const body = dnd.droppables.get('done')
      expect(body).toHaveClass('min-h-[200px]')
      // CardContent > min-h body, same structure as before
      expect(body?.parentElement?.parentElement?.firstElementChild?.textContent).toContain('Feito')
    })
  })

  describe('Interactions', () => {
    it('dropping on an empty column moves the card there', () => {
      const onCardMove = vi.fn()
      render(<KanbanBoard columns={columns} onCardMove={onCardMove} />)
      drop('c1', 'done')
      expect(onCardMove).toHaveBeenCalledWith('c1', 'todo', 'done')
    })

    it("dropping over a card reports that card's column", () => {
      const onCardMove = vi.fn()
      render(<KanbanBoard columns={columns} onCardMove={onCardMove} />)
      drop('c1', 'c2')
      expect(onCardMove).toHaveBeenCalledWith('c1', 'todo', 'doing')
    })
  })

  describe('Edge Cases', () => {
    it('dropping in the same column or outside does nothing', () => {
      const onCardMove = vi.fn()
      render(<KanbanBoard columns={columns} onCardMove={onCardMove} />)
      drop('c1', 'todo')
      drop('c1', 'c1')
      drop('c1', null)
      expect(onCardMove).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('column count badge counts the cards', () => {
      render(<KanbanBoard columns={columns} onCardMove={vi.fn()} />)
      expect(screen.getAllByText('0')).toHaveLength(1)
    })
  })
})
