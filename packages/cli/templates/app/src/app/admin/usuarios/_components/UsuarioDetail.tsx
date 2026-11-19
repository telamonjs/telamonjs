'use client'

import { memo } from 'react'
import {
  Badge,
  ContentTabs,
  SemanticCard,
  SemanticField,
  type TabItem,
} from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
import { formatDate } from '@/lib/utils'
import type { Usuario } from '@/lib/api/usuarios-client'

const UserIcon = getIcon('User')
const MailIcon = getIcon('Mail')
const ShieldIcon = getIcon('Shield')
const KeyIcon = getIcon('KeyRound')
const CalendarIcon = getIcon('Calendar')

interface UsuarioDetailProps {
  usuario: Usuario
}

/**
 * Rendered INSIDE the view dialog (`dialogs.view.renderContent`) — never on
 * its own route. Up to 5 sections: ContentTabs. 6+ sections: switch the
 * config to `dialogs.view.portal`.
 */
function UsuarioDetail({ usuario }: UsuarioDetailProps) {
  // Fixed height: the dialog must not resize when switching tabs.
  const contentHeight = 'h-[min(600px,60vh)] overflow-y-auto'

  const tabs: TabItem[] = [
    {
      value: 'info',
      label: 'Informações',
      icon: 'Info',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className='grid gap-4 md:grid-cols-2'>
            <SemanticCard title='Identificação' icon={UserIcon} color='blue'>
              <SemanticField label='Nome' value={usuario.name} icon={UserIcon} />
              <div>
                <label className='text-xs font-medium text-muted-foreground'>Status</label>
                <div className='mt-1'>
                  <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </SemanticCard>
            <SemanticCard title='Contato' icon={MailIcon} color='green'>
              <SemanticField label='Email' value={usuario.email} icon={MailIcon} />
            </SemanticCard>
          </div>
        </div>
      ),
    },
    {
      value: 'acesso',
      label: 'Acesso',
      icon: 'Shield',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className='grid gap-4 md:grid-cols-2'>
            <SemanticCard title='Permissões' icon={ShieldIcon} color='orange'>
              <SemanticField
                label='Perfil'
                value={usuario.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                icon={ShieldIcon}
              />
              <SemanticField
                label='Login'
                value={usuario.ativo ? 'Permitido' : 'Bloqueado (usuário inativo)'}
                icon={KeyIcon}
              />
            </SemanticCard>
          </div>
        </div>
      ),
    },
    {
      value: 'auditoria',
      label: 'Auditoria',
      icon: 'History',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className='grid gap-4 md:grid-cols-2'>
            <SemanticCard title='Registro' icon={CalendarIcon} color='purple'>
              <SemanticField
                label='Criado em'
                value={formatDate(usuario.createdAt)}
                icon={CalendarIcon}
              />
              <SemanticField
                label='Atualizado em'
                value={formatDate(usuario.updatedAt)}
                icon={CalendarIcon}
              />
            </SemanticCard>
          </div>
        </div>
      ),
    },
  ]

  return <ContentTabs tabs={tabs} variant='default' defaultValue='info' flush />
}

export default memo(UsuarioDetail)
