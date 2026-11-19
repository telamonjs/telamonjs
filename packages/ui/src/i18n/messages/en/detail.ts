import type { MessagesShape } from '../shape'
import type { detail as base } from '../pt-BR/detail'

export const detail = {
  quickActions: 'Quick Actions',
  zoomPhoto: 'Zoom photo',
  zoom: 'Zoom',
  showValue: 'Show value',
  hideValue: 'Hide value',
  loadError: 'Failed to load',
  systemInfo: 'System Information',
  createdAt: 'Created at',
  updatedAt: 'Updated at',
  createdBy: 'Created by',
  updatedBy: 'Updated by',
} satisfies MessagesShape<typeof base>
