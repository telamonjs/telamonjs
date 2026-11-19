import type { MessagesShape } from '../shape'
import type { dialog as base } from '../pt-BR/dialog'

export const dialog = {
  createSubmit: 'Create',
  saveSection: 'Save section',
  editSectionAria: 'Edit {section}',
  loadingData: 'Loading data...',
  retryLabel: 'Try Again',
  confirmDeleteTitle: 'Confirm Deletion',
  confirmDeleteDescription: 'Are you sure you want to delete this item?',
  confirmActionTitle: 'Confirm Action',
  confirmActionDescription: 'Are you sure you want to perform this action?',
  deleting: 'Deleting...',
  loadDataError: 'Failed to load data',
  notFound: 'Record not found',
  defaultTitle: 'Dialog',
} satisfies MessagesShape<typeof base>
