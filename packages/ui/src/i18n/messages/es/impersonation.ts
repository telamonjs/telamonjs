import type { MessagesShape } from '../shape'
import type { impersonation as base } from '../pt-BR/impersonation'

export const impersonation = {
  title: 'Iniciar sesión como otro usuario',
  description:
    'Selecciona un usuario para ver el sistema con sus permisos. Podrás volver a tu propio usuario en cualquier momento.',
  searchPlaceholder: 'Buscar por nombre o correo electrónico...',
  emptyMessage: 'No se encontraron usuarios',
  confirmLabel: 'Iniciar sesión como usuario',
  userLabel: 'Usuario',
  searching: 'Buscando usuarios...',
  searchError: 'No se pudo buscar los usuarios. Inténtalo de nuevo.',
  confirmError: 'No se pudo iniciar la suplantación.',
  confirming: 'Iniciando sesión...',
  bannerLabel: 'Modo de suplantación',
  actingAs: '— estás actuando como <strong>{name}</strong>.',
  actingAsWithOriginal:
    '— estás actuando como <strong>{name}</strong>. Tu cuenta real es <strong>{original}</strong>.',
  unknownUser: 'otro usuario',
  returning: 'Volviendo...',
  backTo: 'Volver a {name}',
  backToGeneric: 'Volver al original',
  stopSuccessDescription: 'Volviste a tu usuario original',
  stopErrorDescription: 'Error al detener la suplantación. Inténtalo de nuevo.',
} satisfies MessagesShape<typeof base>
