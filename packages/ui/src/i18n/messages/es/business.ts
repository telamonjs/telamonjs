import type { MessagesShape } from '../shape'
import type { business as base } from '../pt-BR/business'

export const business = {
  calendar: {
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    more: '+{count, number} más',
  },
  kanban: {
    priorityLow: 'Baja',
    priorityMedium: 'Media',
    priorityHigh: 'Alta',
  },
  selector: {
    searchPlaceholder: 'Buscar...',
    filterPlaceholder: 'Filtrar...',
    searching: 'Buscando...',
    searchAria: 'Buscar opciones',
    noOptions: 'No se encontraron opciones.',
    noResults: 'Sin resultados',
    noResultsFound: 'No se encontraron resultados.',
    selectAll: 'Seleccionar todos',
    selected: '{count, plural, one {# seleccionado} other {# seleccionados}}',
    selectedWord: 'seleccionados',
    selectedOfMax:
      '{count, plural, one {# seleccionado} other {# seleccionados}} / {max, number}',
    choosePlaceholder: 'Elige una opción...',
    comboboxLabel: 'Combobox {name}',
    multiselectLabel: 'Multi-select {name}',
    opened: 'Multi-select abierto',
    closed: 'Multi-select cerrado',
    loadError: 'Error al cargar opciones',
    createError: 'Error al crear opción',
    errorPrefix: 'Error: {message}',
    creating: 'Creando...',
    createOption: 'Crear "{value}"',
    createdAndAdded: 'Creado y agregado: {label}',
    removed: 'Eliminado: {label}',
    added: 'Agregado: {label}',
    maxReached: 'Se alcanzó el máximo de {max, number} selecciones',
  },
  pagination: {
    active: 'Activo',
    inactive: 'Inactivo',
  },
} satisfies MessagesShape<typeof base>
