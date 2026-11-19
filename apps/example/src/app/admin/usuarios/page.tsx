'use client'

import { ListPage } from '@telamonjs/ui'
import { usuariosConfig } from './config'

// All CRUD (view/create/edit/delete) happens in dialogs on this list —
// there are no adicionar/ or [id]/ routes.
export default function UsuariosPage() {
  return <ListPage config={usuariosConfig} />
}
