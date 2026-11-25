'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('usuarios')
  // Fixed height: the dialog must not resize when switching tabs.
  const contentHeight = 'h-[min(600px,60vh)] overflow-y-auto'
  const status = usuario.active ? t('statusActive') : t('statusInactive')

  const tabs: TabItem[] = [
    {
      value: 'info',
      label: t('detail.tabs.info'),
      icon: 'Info',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className='grid gap-4 md:grid-cols-2'>
            <SemanticCard title={t('detail.identification')} icon={UserIcon} color='blue'>
              <SemanticField label={t('fields.name')} value={usuario.name} icon={UserIcon} />
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('columns.status')}
                </label>
                <div className='mt-1'>
                  <Badge variant={usuario.active ? 'default' : 'secondary'}>{status}</Badge>
                </div>
              </div>
            </SemanticCard>
            <SemanticCard title={t('detail.contact')} icon={MailIcon} color='green'>
              <SemanticField label={t('fields.email')} value={usuario.email} icon={MailIcon} />
            </SemanticCard>
          </div>
        </div>
      ),
    },
    {
      value: 'access',
      label: t('detail.tabs.access'),
      icon: 'Shield',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className='grid gap-4 md:grid-cols-2'>
            <SemanticCard title={t('fields.roles')} icon={ShieldIcon} color='green'>
              <div className='flex flex-wrap gap-1'>
                {usuario.roles.length ? (
                  usuario.roles.map((role) => (
                    <Badge key={role.id} variant='outline'>
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <span className='text-sm text-muted-foreground'>{t('noRoles')}</span>
                )}
              </div>
            </SemanticCard>
            <SemanticCard title={t('detail.signIn')} icon={KeyIcon} color='orange'>
              <SemanticField
                label={t('detail.signIn')}
                value={usuario.active ? t('detail.signInAllowed') : t('detail.signInBlocked')}
                icon={KeyIcon}
              />
            </SemanticCard>
          </div>
        </div>
      ),
    },
    {
      value: 'audit',
      label: t('detail.tabs.audit'),
      icon: 'History',
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className='grid gap-4 md:grid-cols-2'>
            <SemanticCard title={t('detail.record')} icon={CalendarIcon} color='purple'>
              <SemanticField
                label={t('columns.createdAt')}
                value={formatDate(usuario.createdAt)}
                icon={CalendarIcon}
              />
              <SemanticField
                label={t('detail.updatedAt')}
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
