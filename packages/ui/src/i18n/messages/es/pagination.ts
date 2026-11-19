import type { MessagesShape } from '../shape'
import type { pagination as base } from '../pt-BR/pagination'

export const pagination = {
  range:
    '{from, number}–{to, number} de {total, plural, one {# resultado} other {# resultados}}',
  noResults: 'Ningún resultado',
  page: 'Página {page, number} de {pages, number}',
  first: 'Primera página',
  firstShort: 'Primera',
  last: 'Última página',
  lastShort: 'Última',
  next: 'Página siguiente',
  nextShort: 'Siguiente',
  previous: 'Página anterior',
  previousShort: 'Anterior',
  allLoaded: 'Todos los elementos cargados',
  selected: '{count, plural, one {# seleccionado} other {# seleccionados}}',
  display: 'Mostrar:',
} satisfies MessagesShape<typeof base>
