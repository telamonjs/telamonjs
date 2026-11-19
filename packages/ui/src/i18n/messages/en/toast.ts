import type { MessagesShape } from '../shape'
import type { toast as base } from '../pt-BR/toast'

export const toast = {
  itemCreated: 'Item created successfully',
  itemUpdated: 'Item updated successfully',
  itemDeleted: 'Item deleted successfully',
  deleteItemError: 'Error deleting item',
  unknownError: 'Unknown error',
  createError: 'Error creating record',
  updateError: 'Error updating record',
  deleteError: 'Error deleting record',
  createNotConfigured: 'Creation not configured.',
  updateNotConfigured: 'Update not configured.',
  deleteNotConfigured: 'Deletion not configured.',
} satisfies MessagesShape<typeof base>
