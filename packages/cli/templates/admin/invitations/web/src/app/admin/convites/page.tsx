'use client'

import { ListPage } from '@telamonjs/ui'
import { convitesConfig } from './config'

// Inviting happens in a dialog on this list; resend and revoke are row actions.
export default function ConvitesPage() {
  return <ListPage config={convitesConfig} />
}
