'use client'

import { memo } from 'react'
import {
  ContentTabs,
  type TabItem,
  SemanticCard,
  SemanticField,
  Badge
} from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
import { formatDate } from '@/lib/utils'
import type { CargoRow } from '../config'

const BriefcaseIcon = getIcon('Briefcase')
const InfoIcon = getIcon('Info')
const HistoryIcon = getIcon('History')
const CalendarIcon = getIcon('Calendar')

interface CargoDetailProps {
  cargo: CargoRow
}

function CargoDetail({ cargo }: CargoDetailProps) {
  const contentHeight = 'h-[min(600px,60vh)] overflow-y-auto'

  const tabs: TabItem[] = [
    {
      value: 'info',
      label: 'Informações',
      icon: InfoIcon,
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <SemanticCard title="Identificação" icon={BriefcaseIcon} color="blue">
              <SemanticField label="Descrição" value={cargo.descricao} icon={BriefcaseIcon} />
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
                  Status
                </label>
                <div className="mt-1">
                  <Badge variant={cargo.ativo ? 'default' : 'secondary'}>
                    {cargo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </SemanticCard>
          </div>
        </div>
      )
    },
    {
      value: 'auditoria',
      label: 'Auditoria',
      icon: HistoryIcon,
      content: (
        <div className={`p-6 ${contentHeight}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <SemanticCard title="Registro" icon={CalendarIcon} color="purple">
              <SemanticField label="Criado em" value={formatDate(cargo.createdAt)} icon={CalendarIcon} />
              <SemanticField
                label="Atualizado em"
                value={formatDate(cargo.updatedAt)}
                icon={CalendarIcon}
              />
            </SemanticCard>
          </div>
        </div>
      )
    }
  ]

  return <ContentTabs tabs={tabs} variant="default" defaultValue="info" flush />
}

export default memo(CargoDetail)
