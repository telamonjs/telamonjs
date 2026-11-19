import type { MessagesShape } from '../shape'
import type { dialog as base } from '../pt-BR/dialog'

export const dialog = {
  createSubmit: 'Crear',
  saveSection: 'Guardar sección',
  editSectionAria: 'Editar {section}',
  loadingData: 'Cargando datos...',
  retryLabel: 'Intentar de Nuevo',
  confirmDeleteTitle: 'Confirmar Eliminación',
  confirmDeleteDescription: '¿Estás seguro de que deseas eliminar este elemento?',
  confirmActionTitle: 'Confirmar acción',
  confirmActionDescription: '¿Estás seguro de que deseas realizar esta acción?',
  deleting: 'Eliminando...',
  loadDataError: 'Error al cargar los datos',
  notFound: 'Registro no encontrado',
  defaultTitle: 'Diálogo',
} satisfies MessagesShape<typeof base>
