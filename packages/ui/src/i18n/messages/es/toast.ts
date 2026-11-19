import type { MessagesShape } from '../shape'
import type { toast as base } from '../pt-BR/toast'

export const toast = {
  itemCreated: 'Elemento creado con éxito',
  itemUpdated: 'Elemento actualizado con éxito',
  itemDeleted: 'Elemento eliminado con éxito',
  deleteItemError: 'Error al eliminar el elemento',
  unknownError: 'Error desconocido',
  createError: 'Error al crear el registro',
  updateError: 'Error al actualizar el registro',
  deleteError: 'Error al eliminar el registro',
  createNotConfigured: 'Creación no configurada.',
  updateNotConfigured: 'Actualización no configurada.',
  deleteNotConfigured: 'Eliminación no configurada.',
} satisfies MessagesShape<typeof base>
