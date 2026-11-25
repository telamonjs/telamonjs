'use client'

import { ListPage } from '@telamonjs/ui'
import { parametrosConfig } from './config'

// All CRUD (create/edit/delete) happens in dialogs on this list.
export default function ParametrosPage() {
  return <ListPage config={parametrosConfig} />
}
