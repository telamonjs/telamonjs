'use client'

import {
  Badge,
  type CrudColumnDef,
  type CrudConfig,
  type DialogHeaderConfig,
} from '@telamonjs/ui'
import { msg, Msg } from '@telamonjs/ui/i18n'
import { getIcon } from '@/lib/icons'
import { auditApi, type AuditLog } from '@/lib/api/audit-client'
import { formatDate } from '@/lib/utils'
import AuditDetail from './_components/AuditDetail'

// Action codes are data (what the API stores), shown as they are.
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 'GRANT', 'REVOKE']

function actionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action === 'DELETE' || action === 'DEACTIVATE' || action === 'REVOKE') return 'destructive'
  if (action === 'CREATE' || action === 'GRANT' || action === 'ACTIVATE') return 'default'
  return 'secondary'
}

// ============================================================================
// 1. HEADER CONFIG (view dialog)
// ============================================================================
const headerConfig: DialogHeaderConfig<AuditLog> = {
  icon: 'History',
  iconColor: 'gray',
  title: (e) => `${e.action} · ${e.entityType}`,
  subtitle: (e) => formatDate(e.createdAt),
  gradient: 'from-slate-50 to-gray-50',
}

// ============================================================================
// 2. COLUMNS
// ============================================================================
export const columns: CrudColumnDef<AuditLog>[] = [
  {
    header: msg('auditoria.columns.when'),
    accessorKey: 'createdAt',
    cell: ({ row }) => (
      <span className='whitespace-nowrap text-sm'>{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    header: msg('auditoria.columns.who'),
    id: 'user',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.user ? (
        <div>
          <div className='font-medium'>{row.original.user.name ?? row.original.user.email}</div>
          <div className='text-xs text-muted-foreground'>{row.original.user.email}</div>
        </div>
      ) : (
        <span className='font-mono text-xs text-muted-foreground'>
          {row.original.userId ?? <Msg k='auditoria.anonymous' />}
        </span>
      ),
  },
  {
    header: msg('auditoria.columns.action'),
    accessorKey: 'action',
    cell: ({ row }) => (
      <Badge variant={actionVariant(row.original.action)}>{row.original.action}</Badge>
    ),
  },
  {
    header: msg('auditoria.columns.entity'),
    accessorKey: 'entityType',
  },
  {
    header: msg('auditoria.columns.entityId'),
    accessorKey: 'entityId',
    cell: ({ row }) => (
      <span className='font-mono text-xs text-muted-foreground'>{row.original.entityId}</span>
    ),
  },
]

// ============================================================================
// 3. CRUD CONFIG — read-only: entries are written by the API, never here.
// ============================================================================
export const auditoriaConfig: CrudConfig<AuditLog> = {
  module: {
    name: 'auditoria',
    title: msg('auditoria.title'),
    description: msg('auditoria.description'),
    route: '/admin/auditoria',
  },

  permissions: { view: 'audit.read' },

  list: {
    title: '',
    description: '',
    searchPlaceholder: msg('auditoria.searchPlaceholder'),
    columns,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 50,
    toolbar: {
      counterLabel: msg('auditoria.counter'),
      filters: [
        {
          key: 'action',
          label: msg('auditoria.columns.action'),
          displayMode: 'select',
          options: [
            { value: 'all', label: msg('auditoria.allActions') },
            ...ACTIONS.map((action) => ({ value: action, label: action })),
          ],
        },
      ],
    },
  },

  query: { queryKey: ['auditoria'], queryFn: auditApi.list, staleTime: 10_000 },

  mutations: { getForView: auditApi.getById },

  actionsConfig: {
    standard: {
      view: { icon: getIcon('Eye'), tooltip: msg('auditoria.actions.view') },
    },
  },

  dialogs: {
    view: {
      urlParam: 'view',
      title: msg('auditoria.dialogs.view.title'),
      headerConfig,
      renderContent: (item) => <AuditDetail entry={item} />,
    },
  },
}
