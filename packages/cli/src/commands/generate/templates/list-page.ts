/**
 * Template for the list page (page.tsx) -- the module's only route.
 * Reference: packages/cli/templates/app/src/app/admin/usuarios/page.tsx
 */
import { camelCase, capitalize } from '../utils/formatters.js'

export interface ListPageOptions {
  name: string
}

export function generateListPage(options: ListPageOptions): string {
  const { name } = options
  const configVar = `${camelCase(name)}Config`

  return `'use client'

import { ListPage } from '@telamonjs/ui'
import { ${configVar} } from './config'

// All CRUD (view/create/edit/delete) happens in dialogs on this list --
// there are no adicionar/ or [id]/ routes.
export default function ${capitalize(camelCase(name))}Page() {
  return <ListPage config={${configVar}} />
}
`
}
