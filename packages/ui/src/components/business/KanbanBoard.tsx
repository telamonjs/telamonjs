'use client'

import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar'
import { Badge } from '../../ui/badge'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useTelamonjsT } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

/**
 * Kanban card
 */
export interface KanbanCard {
  id: string
  title: string
  description?: string
  assignee?: {
    name: string
    avatar?: string
  }
  priority?: 'low' | 'medium' | 'high'
  dueDate?: Date
  tags?: string[]
}

/**
 * Kanban column
 */
export interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
  color?: string
  limit?: number
}

/**
 * KanbanBoard props
 */
export interface KanbanBoardProps {
  columns: KanbanColumn[]
  onCardMove: (cardId: string, fromColumn: string, toColumn: string) => void
  onCardClick?: (card: KanbanCard) => void
  className?: string
}

const priorityStyles = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
}

const priorityLabelKeys = {
  low: 'business.kanban.priorityLow',
  medium: 'business.kanban.priorityMedium',
  high: 'business.kanban.priorityHigh',
} as const

function SortableCard({
  card,
  onClick,
}: {
  card: KanbanCard
  onClick?: (card: KanbanCard) => void
}) {
  const t = useTelamonjsT()
  const dateFnsLocale = useDateFnsLocale()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('mb-2', isDragging && 'opacity-50')}
    >
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-shadow',
          onClick && 'hover:border-primary'
        )}
        onClick={() => onClick?.(card)}
      >
        <CardContent className='p-3'>
          <h4 className='font-semibold text-sm mb-2'>{card.title}</h4>
          {card.description && (
            <p className='text-xs text-muted-foreground mb-3 line-clamp-2'>
              {card.description}
            </p>
          )}

          {card.tags && card.tags.length > 0 && (
            <div className='flex flex-wrap gap-1 mb-3'>
              {card.tags.map(tag => (
                <Badge key={tag} variant='outline' className='text-xs'>
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              {card.assignee && (
                <Avatar className='w-6 h-6'>
                  <AvatarImage
                    src={card.assignee.avatar}
                    alt={card.assignee.name}
                  />
                  <AvatarFallback className='text-xs'>
                    {card.assignee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              {card.priority && (
                <Badge
                  variant='secondary'
                  className={cn('text-xs', priorityStyles[card.priority])}
                >
                  {t(priorityLabelKeys[card.priority])}
                </Badge>
              )}
            </div>

            {card.dueDate && (
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <Clock className='w-3 h-3' />
                <span>
                  {format(card.dueDate, 'dd/MM', { locale: dateFnsLocale })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Column body as a drop target, so an empty column still accepts a card. */
function ColumnDropZone({
  columnId,
  children,
}: {
  columnId: string
  children: ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: columnId })
  return (
    <div ref={setNodeRef} className='min-h-[200px]'>
      {children}
    </div>
  )
}

/**
 * KanbanBoard - Kanban board component with drag & drop
 *
 * @example
 * ```tsx
 * <KanbanBoard
 *   columns={[
 *     {
 *       id: 'todo',
 *       title: 'To Do',
 *       cards: [...],
 *       color: 'blue'
 *     }
 *   ]}
 *   onCardMove={(cardId, from, to) => {
 *     console.log(`Moved ${cardId} from ${from} to ${to}`)
 *   }}
 * />
 * ```
 */
export function KanbanBoard({
  columns,
  onCardMove,
  onCardClick,
  className,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const card = columns
      .flatMap(col => col.cards)
      .find(c => c.id === event.active.id)
    setActiveCard(card || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null)

    const { active, over } = event
    if (!over) return

    const activeCardId = active.id as string
    const overId = over.id as string
    const columnOf = (cardId: string) =>
      columns.find(col => col.cards.some(card => card.id === cardId))

    const fromColumn = columnOf(activeCardId)
    // `over` is a column body (droppable) or a card inside a column
    const toColumn = columns.find(col => col.id === overId) ?? columnOf(overId)

    if (!fromColumn || !toColumn || fromColumn.id === toColumn.id) return

    onCardMove(activeCardId, fromColumn.id, toColumn.id)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
        {columns.map(column => (
          <div key={column.id} className='flex-shrink-0 w-80'>
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    {column.color && (
                      <div
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: column.color }}
                      />
                    )}
                    {column.title}
                  </CardTitle>
                  <Badge variant='secondary'>
                    {column.cards.length}
                    {column.limit && ` / ${column.limit}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <SortableContext
                  id={column.id}
                  items={column.cards.map(card => card.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ColumnDropZone columnId={column.id}>
                    {column.cards.map(card => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        onClick={onCardClick}
                      />
                    ))}
                  </ColumnDropZone>
                </SortableContext>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeCard && (
          <Card className='w-80 opacity-90'>
            <CardContent className='p-3'>
              <h4 className='font-semibold text-sm'>{activeCard.title}</h4>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}
