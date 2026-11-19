import type { MessagesShape } from '../shape'
import type { pagination as base } from '../pt-BR/pagination'

export const pagination = {
  range:
    '{from, number}–{to, number} of {total, plural, one {# result} other {# results}}',
  noResults: 'No results',
  page: 'Page {page, number} of {pages, number}',
  first: 'First page',
  firstShort: 'First',
  last: 'Last page',
  lastShort: 'Last',
  next: 'Next page',
  nextShort: 'Next',
  previous: 'Previous page',
  previousShort: 'Previous',
  allLoaded: 'All items loaded',
  selected: '{count, plural, one {# selected} other {# selected}}',
  display: 'Show:',
} satisfies MessagesShape<typeof base>
