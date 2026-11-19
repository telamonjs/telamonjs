import type { MessagesShape } from '../shape'
import type { navigation as base } from '../pt-BR/navigation'

export const navigation = {
  navigationGroupLabel: 'Navigation',
  searchGroupLabel: 'Search',
  beta: 'Beta',
  commandPaletteTitle: 'Command palette',
  itemDisabled: '{title} (disabled)',
  childrenCount: '{count, plural, one {# item} other {# items}}',
  hiddenSegments: 'View hidden segments',
  breadcrumbNav: 'Breadcrumb',
  idLabel: 'ID: {value}',
  creating: 'Creating',
  editing: 'Editing',
  viewing: 'Viewing',
} satisfies MessagesShape<typeof base>
