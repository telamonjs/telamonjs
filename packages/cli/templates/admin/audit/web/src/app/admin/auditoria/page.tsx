'use client'

import { ListPage } from '@telamonjs/ui'
import { auditoriaConfig } from './config'

// Read-only list; each entry opens in the view dialog.
export default function AuditoriaPage() {
  return <ListPage config={auditoriaConfig} />
}
