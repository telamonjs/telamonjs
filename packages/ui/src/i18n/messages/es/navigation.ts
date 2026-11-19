import type { MessagesShape } from '../shape'
import type { navigation as base } from '../pt-BR/navigation'

export const navigation = {
  navigationGroupLabel: 'Navegación',
  searchGroupLabel: 'Buscar',
  beta: 'Beta',
  commandPaletteTitle: 'Paleta de comandos',
  itemDisabled: '{title} (deshabilitado)',
  childrenCount: '{count, plural, one {# elemento} other {# elementos}}',
  hiddenSegments: 'Ver segmentos ocultos',
  breadcrumbNav: 'Ruta de navegación',
  idLabel: 'ID: {value}',
  creating: 'Creando',
  editing: 'Editando',
  viewing: 'Visualizando',
} satisfies MessagesShape<typeof base>
