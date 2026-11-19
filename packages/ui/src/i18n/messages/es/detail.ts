import type { MessagesShape } from '../shape'
import type { detail as base } from '../pt-BR/detail'

export const detail = {
  quickActions: 'Acciones Rápidas',
  zoomPhoto: 'Ampliar foto',
  zoom: 'Ampliar',
  showValue: 'Mostrar valor',
  hideValue: 'Ocultar valor',
  loadError: 'Error al cargar',
  systemInfo: 'Información del Sistema',
  createdAt: 'Creado el',
  updatedAt: 'Actualizado el',
  createdBy: 'Creado por',
  updatedBy: 'Actualizado por',
} satisfies MessagesShape<typeof base>
