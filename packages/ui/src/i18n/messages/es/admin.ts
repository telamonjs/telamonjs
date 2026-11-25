import type { MessagesShape } from '../shape'
import type { admin as base } from '../pt-BR/admin'

export const admin = {
  permissionMatrix: {
    caption: 'Matriz de permisos',
    permission: 'Permiso',
    search: 'Buscar permiso...',
    searchLabel: 'Buscar permiso',
    noResults: 'No se encontró ningún permiso.',
    system: 'Sistema',
    cellLabel: '{permission} para {role}',
    groupLabel: 'Todos los permisos de {group} para {role}',
    toggleError: 'No se pudo actualizar el permiso.',
  },
  auditChanges: {
    field: 'Campo',
    value: 'Valor',
    before: 'Antes',
    after: 'Después',
    empty: 'No hay cambios registrados.',
    noChangedFields: 'Ningún campo cambió.',
    showAll: 'Mostrar todos los campos ({count})',
    showChanged: 'Mostrar solo los modificados',
    redacted: 'oculto',
    entries: '{count, plural, one {# elemento} other {# elementos}}',
  },
} satisfies MessagesShape<typeof base>
