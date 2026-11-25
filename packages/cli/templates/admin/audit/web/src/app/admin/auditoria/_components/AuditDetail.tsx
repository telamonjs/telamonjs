'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { AuditChangesViewer, SemanticCard, SemanticField } from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
import type { AuditLog } from '@/lib/api/audit-client'

const UserIcon = getIcon('User')
const ActivityIcon = getIcon('Activity')
const HistoryIcon = getIcon('History')

interface AuditDetailProps {
  entry: AuditLog
}

/** Rendered INSIDE the view dialog (`dialogs.view.renderContent`) — never on its own route. */
function AuditDetail({ entry }: AuditDetailProps) {
  const t = useTranslations('auditoria')

  return (
    <div className='h-[min(600px,60vh)] space-y-4 overflow-y-auto p-6'>
      <div className='grid gap-4 md:grid-cols-2'>
        <SemanticCard title={t('detail.actor')} icon={UserIcon} color='blue'>
          <SemanticField label={t('columns.who')} value={entry.user?.email ?? entry.userId} icon={UserIcon} />
          <SemanticField label={t('detail.impersonatedBy')} value={entry.impersonatedBy} mono />
          <SemanticField label={t('detail.ip')} value={entry.ipAddress} mono />
          <SemanticField label={t('detail.userAgent')} value={entry.userAgent} />
        </SemanticCard>
        <SemanticCard title={t('detail.request')} icon={ActivityIcon} color='purple'>
          <SemanticField label={t('columns.entity')} value={entry.entityType} />
          <SemanticField label={t('columns.entityId')} value={entry.entityId} mono />
          <SemanticField
            label={t('detail.request')}
            value={[entry.method, entry.path].filter(Boolean).join(' ')}
            mono
          />
          <SemanticField label={t('detail.status')} value={entry.statusCode} />
        </SemanticCard>
      </div>
      <SemanticCard title={t('detail.changes')} icon={HistoryIcon} color='orange'>
        {entry.changes ? (
          <AuditChangesViewer changes={entry.changes} />
        ) : (
          <p className='text-sm text-muted-foreground'>{t('detail.noChanges')}</p>
        )}
      </SemanticCard>
    </div>
  )
}

export default memo(AuditDetail)
