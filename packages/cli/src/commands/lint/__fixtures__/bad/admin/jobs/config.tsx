'use client'

import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { Play, Pause, Zap, Calendar, ListChecks, FileText, Inbox } from 'lucide-react'
import {
  Badge,
  ContentTabs,
  EmptyState,
  SemanticCard,
  SemanticField,
  type CrudConfig,
  type DialogHeaderConfig,
  type FormSection,
  type TabItem,
} from '@telamonjs/ui'
import { jobsApi, type Job, type JobDetail, type JobRun, type JobFormData } from '@/lib/api/jobs-client'
import { formatDateTime, formatDuration, formatTokens } from '@/lib/format'
import { STATUS_LABEL, STATUS_VARIANT, label } from '@/lib/labels'

// ============================================================================
// VALIDATION SCHEMA (create/edit)
// ============================================================================
export const validationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  scheduleDisplay: z.string().min(1, 'Agenda é obrigatória'),
  prompt: z.string().optional(),
  deliver: z.string().default('local'),
  skills: z.array(z.string()).optional(),
  paused: z.preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean()).default(false),
})

export const formSections: FormSection[] = [
  {
    label: 'Job',
    description: 'Rotina agendada do agente (cron do Hermes)',
    fields: [
      { name: 'name', label: 'Nome', type: 'text', placeholder: 'brief-diario', required: true },
      {
        name: 'scheduleDisplay',
        label: 'Agenda',
        type: 'text',
        placeholder: '0 7 * * * (cron) ou "todo dia às 7h"',
        required: true,
      },
      // span='2' = largura total (BaseForm monta `col-span-${span}`; 'col-span-2' geraria classe inválida)
      { name: 'prompt', label: 'Prompt', type: 'textarea', span: '2' },
      {
        name: 'deliver',
        label: 'Entrega',
        type: 'text',
        placeholder: 'local',
        description: 'Para onde o Hermes envia o resultado (local, telegram, …)',
      },
      {
        name: 'skills',
        label: 'Skills',
        type: 'multiselect',
        loadField: async () => {
          const res = await fetch('/api/jobs/skill-options', { credentials: 'include' })
          if (!res.ok) return []
          return res.json()
        },
      },
      { name: 'paused', label: 'Pausada', type: 'boolean' },
    ],
  },
]

// ============================================================================
// COLUMNS
// ============================================================================
const StatusBadge = ({ status }: { status: string | null | undefined }) =>
  status ? (
    <Badge variant={STATUS_VARIANT[status] ?? 'outline'}>{label(STATUS_LABEL, status)}</Badge>
  ) : (
    <span className="text-muted-foreground">—</span>
  )

export const columns: ColumnDef<Job>[] = [
  {
    header: 'Nome',
    accessorKey: 'name',
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    header: 'Agenda',
    accessorKey: 'scheduleDisplay',
    cell: ({ row }) => row.original.scheduleDisplay ?? '—',
  },
  {
    header: 'Estado',
    accessorKey: 'paused',
    cell: ({ row }) =>
      row.original.paused ? (
        <Badge variant="secondary">{STATUS_LABEL.paused}</Badge>
      ) : (
        <Badge className="bg-green-600">{STATUS_LABEL.active}</Badge>
      ),
  },
  {
    header: 'Último status',
    accessorKey: 'lastStatus',
    cell: ({ row }) => <StatusBadge status={row.original.lastStatus} />,
  },
  {
    header: 'Última execução',
    accessorKey: 'lastRunAt',
    cell: ({ row }) => formatDateTime(row.original.lastRunAt),
  },
  {
    header: 'Próxima',
    accessorKey: 'nextRunAt',
    cell: ({ row }) => formatDateTime(row.original.nextRunAt),
  },
]

// ============================================================================
// VIEW DIALOG — Detalhes / Execuções / Último output
// ============================================================================
// altura fixa (não min/max): o dialog não pula ao trocar de aba
const contentHeight = 'p-6 h-[min(560px,60vh)] overflow-y-auto'

function DetalhesTab({ data }: { data: JobDetail }) {
  return (
    <div className={contentHeight}>
      <div className="grid gap-4 md:grid-cols-2">
        <SemanticCard title="Agendamento" icon={Calendar} color="blue">
          <SemanticField label="Agenda" value={data.scheduleDisplay} mono />
          <SemanticField label="Entrega" value={data.deliver ?? '—'} />
          <SemanticField label="Skills" value={data.skills?.join(', ') || '—'} />
          <SemanticField label="Próxima execução" value={formatDateTime(data.nextRunAt)} />
        </SemanticCard>
        <SemanticCard title="Saúde" icon={ListChecks} color={data.failureStreak ? 'orange' : 'green'}>
          <div className="flex flex-col gap-1.5 py-1">
            <span className="text-xs text-muted-foreground">Último status</span>
            <div>
              <StatusBadge status={data.lastStatus} />
            </div>
          </div>
          <SemanticField label="Última execução" value={formatDateTime(data.lastRunAt)} />
          <SemanticField label="Falhas seguidas" value={data.failureStreak} />
          <SemanticField label="Motivo da pausa" value={data.pausedReason ?? '—'} />
          {data.lastError && <SemanticField label="Último erro" value={data.lastError} mono />}
        </SemanticCard>
      </div>
      <div className="mt-4">
        <p className="mb-1 text-xs text-muted-foreground">Prompt</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-sm">
          {data.prompt ?? '—'}
        </pre>
      </div>
    </div>
  )
}

function ExecucoesTab({ runs }: { runs: JobRun[] }) {
  if (runs.length === 0) {
    return (
      <div className={contentHeight}>
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="Sem execuções ainda"
          description="As execuções aparecem aqui depois da próxima sincronização com o Hermes."
        />
      </div>
    )
  }
  return (
    <div className={contentHeight}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-2 font-medium">Status</th>
            <th className="py-2 pr-2 font-medium">Início</th>
            <th className="py-2 pr-2 font-medium">Duração</th>
            <th className="py-2 pr-2 text-right font-medium">Tokens</th>
            <th className="py-2 font-medium">Erro</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const seconds =
              run.finishedAt && run.startedAt
                ? (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000
                : null
            return (
              <tr key={run.id} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  <StatusBadge status={run.status} />
                </td>
                <td className="py-2 pr-2 whitespace-nowrap">{formatDateTime(run.startedAt)}</td>
                <td className="py-2 pr-2 whitespace-nowrap">{formatDuration(seconds)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatTokens(run.tokens)}</td>
                <td className="py-2 text-xs text-destructive">{run.error ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function OutputTab({ output }: { output: string | null }) {
  if (!output) {
    return (
      <div className={contentHeight}>
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Nenhum output ainda"
          description="O último output da rotina aparece aqui após uma execução concluída."
        />
      </div>
    )
  }
  // ponytail: sem lib de markdown no projeto (react-markdown não está em
  // node_modules) — <pre> com fonte normal cobre o caso; trocar por um renderer
  // quando houver um instalado.
  return (
    <div className={contentHeight}>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{output}</pre>
    </div>
  )
}

function JobViewContent({ data }: { data: JobDetail }) {
  const tabs: TabItem[] = [
    { value: 'detalhes', label: 'Detalhes', icon: 'Info', content: <DetalhesTab data={data} /> },
    {
      value: 'execucoes',
      label: 'Execuções',
      icon: 'Activity',
      badge: data.runs.length || undefined,
      content: <ExecucoesTab runs={data.runs} />,
    },
    { value: 'output', label: 'Último output', icon: 'FileText', content: <OutputTab output={data.output} /> },
  ]
  return <ContentTabs tabs={tabs} variant="default" defaultValue="detalhes" flush />
}

const headerConfig: DialogHeaderConfig<Job> = {
  icon: 'Clock',
  iconColor: 'blue',
  title: (j) => j.name,
  subtitle: (j) => j.scheduleDisplay,
  gradient: 'from-blue-50 to-indigo-50',
  badge: {
    field: 'paused',
    variants: { true: 'secondary', false: 'default' },
    labels: { true: STATUS_LABEL.paused, false: STATUS_LABEL.active },
  },
}

// ============================================================================
// CRUD CONFIG
// ============================================================================
export const config: CrudConfig<Job, JobFormData> = {
  module: {
    name: 'jobs',
    title: 'Jobs',
    description: 'Rotinas agendadas do agente (cron do Hermes)',
    route: '/admin/jobs',
  },
  list: {
    title: 'Jobs',
    description: 'Rotinas agendadas do agente (cron do Hermes)',
    columns,
    searchPlaceholder: 'Buscar por nome...',
    infiniteScroll: false,
    toolbar: { counterLabel: (n) => (n === 1 ? 'job' : 'jobs') },
  },
  form: { sections: formSections, validation: validationSchema },
  query: { queryKey: ['jobs'], queryFn: jobsApi.list },
  mutations: {
    create: {
      mutationFn: async (data) => ({ success: true, data: await jobsApi.create(data) }),
      invalidates: [['jobs']],
    },
    update: {
      mutationFn: async ({ id, data }) => ({ success: true, data: await jobsApi.update(id, data) }),
      invalidates: [['jobs']],
    },
    delete: {
      mutationFn: async ({ id }) => {
        await jobsApi.delete(id)
        return { success: true }
      },
      invalidates: [['jobs']],
    },
    getForEdit: async (id) => {
      const job = await jobsApi.getById(id)
      return {
        name: job.name,
        scheduleDisplay: job.scheduleDisplay ?? '',
        prompt: job.prompt,
        deliver: job.deliver,
        skills: job.skills,
        paused: job.paused,
      }
    },
    getForView: jobsApi.getById,
  },
  actionsConfig: {
    standard: {
      view: { tooltip: 'Ver detalhes' },
      edit: { tooltip: 'Editar' },
      delete: {
        tooltip: 'Excluir',
        confirmDialog: {
          title: (j) => `Excluir rotina "${j.name}"?`,
          description: 'A rotina é removida do cron do Hermes. As execuções já sincronizadas ficam no histórico.',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          variant: 'destructive',
        },
      },
    },
    // Ícone + tooltip, sem label (padrão dos apps): a coluna não
    // estoura. Ficam inline (não no menu "…") porque o dropdown da lib não
    // abre confirmDialog.
    custom: [
      {
        id: 'resume',
        icon: Play,
        tooltip: 'Retomar rotina',
        position: 'before',
        visible: (row) => row.paused,
        handler: (row) => jobsApi.resume(row.id),
        successMessage: (row) => `Rotina "${row.name}" retomada`,
      },
      {
        id: 'pause',
        icon: Pause,
        tooltip: 'Pausar rotina',
        position: 'before',
        visible: (row) => !row.paused,
        handler: (row) => jobsApi.pause(row.id),
        successMessage: (row) => `Rotina "${row.name}" pausada`,
      },
      {
        id: 'trigger',
        icon: Zap,
        tooltip: 'Disparar agora',
        position: 'before',
        handler: (row) => jobsApi.trigger(row.id),
        successMessage: (row) => `Rotina "${row.name}" disparada`,
        confirmDialog: {
          title: (row) => `Disparar "${row.name}" agora?`,
          description: 'O Hermes executa a rotina imediatamente, fora da agenda.',
          confirmText: 'Disparar',
          cancelText: 'Cancelar',
        },
      },
    ],
  },
  dialogs: {
    view: {
      title: (j) => j.name,
      headerConfig,
      renderContent: (j) => <JobViewContent data={j as JobDetail} />,
      urlParam: 'view',
      size: 'lg',
    },
    edit: { title: 'Editar job', urlParam: 'edit', headerConfig },
    create: {
      title: 'Novo job',
      urlParam: 'create',
      headerConfig: { ...headerConfig, title: 'Novo job', subtitle: 'Agende uma rotina no Hermes', badge: undefined },
    },
  },
}
