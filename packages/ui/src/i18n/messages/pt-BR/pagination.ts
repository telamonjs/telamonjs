export const pagination = {
  range:
    '{from, number}–{to, number} de {total, plural, one {# resultado} other {# resultados}}',
  noResults: 'Nenhum resultado',
  page: 'Página {page, number} de {pages, number}',
  first: 'Primeira página',
  firstShort: 'Primeira',
  last: 'Última página',
  lastShort: 'Última',
  next: 'Próxima página',
  nextShort: 'Próxima',
  previous: 'Página anterior',
  previousShort: 'Anterior',
  allLoaded: 'Todos os itens carregados',
  selected: '{count, plural, one {# selecionado} other {# selecionados}}',
  display: 'Exibir:',
} as const
