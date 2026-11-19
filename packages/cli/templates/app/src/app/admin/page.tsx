'use client'

/**
 * Tabbed dashboard — the canonical telamonjs-ui pattern
 *
 * Composes: ShellPage + AdminHeader + AdminTabs + useTabUrlSync
 *
 * Each tab can host a <ListPage config={X} embedded /> or custom
 * content. The URL (?tab=visao-geral) is the source of truth —
 * deep links and the browser Back button work.
 */

import {
  ShellPage,
  AdminHeader,
  AdminTabs,
  useTabUrlSync,
  type TabItem,
} from '@telamonjs/ui'
import { StatCard } from '@telamonjs/ui/cards'

const TAB_VALUES = ['visao-geral', 'estatisticas'] as const

const tabs: TabItem[] = [
  {
    value: 'visao-geral',
    label: 'Visão Geral',
    content: <VisaoGeralTab />,
  },
  {
    value: 'estatisticas',
    label: 'Estatísticas',
    content: <EstatisticasTab />,
  },
]

export default function DashboardPage() {
  const { activeTab, setTab } = useTabUrlSync({ tabs: TAB_VALUES })

  return (
    <ShellPage>
      <AdminHeader
        title="Dashboard"
        description="Bem-vindo ao painel administrativo"
      />
      <AdminTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={setTab}
      />
    </ShellPage>
  )
}

function VisaoGeralTab() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Usuários" value={1} icon="Users" color="blue" animate />
        <StatCard label="Registros" value={0} icon="Activity" color="gray" animate />
        <StatCard label="Status" value="Ativo" icon="TrendingUp" color="green" />
        <StatCard label="Configurações" value="OK" icon="Settings" color="purple" />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">Início Rápido</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Autenticação configurada e funcionando</p>
          <p>Shell administrativo com AdminShell (ModernSidebar + Cmd+K + breadcrumb)</p>
          <p>Dashboard com abas (ShellPage + AdminHeader + AdminTabs + useTabUrlSync)</p>
          <p>Menu tipado com ícones por string (sem cast as any)</p>
          <p>Módulo Usuários completo como referência CRUD</p>
        </div>
      </div>
    </div>
  )
}

function EstatisticasTab() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 text-xl font-semibold">Estatísticas do Sistema</h2>
        <p className="text-sm text-muted-foreground">
          Adicione aqui gráficos e métricas usando os componentes de charts
          do telamonjs-ui (LineChart, BarChart, PieChart, KPICard etc.).
        </p>
      </div>
    </div>
  )
}
