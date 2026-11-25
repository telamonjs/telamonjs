'use client'

import { useTranslations } from 'next-intl'
import {
  AdminHeader,
  AdminTabs,
  ListPage,
  ShellPage,
  useTabUrlSync,
  type TabItem,
} from '@telamonjs/ui'
import { papeisConfig } from './config'
import { RolesMatrix } from './_components/RolesMatrix'

const TAB_VALUES = ['papeis', 'permissoes'] as const

// Two views of one module: the role records (CRUD in dialogs) and the
// roles × permissions matrix.
export default function PapeisPage() {
  const t = useTranslations('papeis')
  const { activeTab, setTab } = useTabUrlSync({ tabs: TAB_VALUES })

  const tabs: TabItem[] = [
    { value: 'papeis', label: t('tabs.roles'), content: <ListPage config={papeisConfig} embedded /> },
    {
      value: 'permissoes',
      label: t('tabs.permissions'),
      content: (
        <div className='p-4 lg:p-6'>
          <RolesMatrix />
        </div>
      ),
    },
  ]

  return (
    <ShellPage>
      <AdminHeader title={t('title')} description={t('description')} />
      <AdminTabs tabs={tabs} value={activeTab} onValueChange={setTab} />
    </ShellPage>
  )
}
