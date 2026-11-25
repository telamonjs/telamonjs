'use client'

import { z } from 'zod'
import {
  Badge,
  type CrudColumnDef,
  type CrudConfig,
  type DialogHeaderConfig,
  type FormSection,
} from '@telamonjs/ui'
import { msg, Msg } from '@telamonjs/ui/i18n'
import { getIcon } from '@/lib/icons'
import { invitationsApi, type Invitation, type InvitationStatus } from '@/lib/api/invitations-client'
import { rolesApi } from '@/lib/api/roles-client'
import { formatDate } from '@/lib/utils'

// ============================================================================
// 1. VALIDATION SCHEMA
// ============================================================================
export const validationSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
})

export type InvitationFormData = z.infer<typeof validationSchema>

const STATUS_VARIANT: Record<InvitationStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'default',
  ACCEPTED: 'secondary',
  EXPIRED: 'outline',
  REVOKED: 'destructive',
}

/** Resend and revoke apply while the invitation has not been used or revoked. */
const open = (row: Invitation) => row.status === 'PENDING' || row.status === 'EXPIRED'

// ============================================================================
// 2. HEADER CONFIG (create dialog)
// ============================================================================
const headerConfig: DialogHeaderConfig<Invitation> = {
  icon: 'Mail',
  iconColor: 'blue',
  title: msg('convites.dialogs.create.title'),
  gradient: 'from-blue-50 to-indigo-50',
}

// ============================================================================
// 3. COLUMNS
// ============================================================================
export const columns: CrudColumnDef<Invitation>[] = [
  {
    header: msg('convites.columns.email'),
    accessorKey: 'email',
    cell: ({ row }) => (
      <div>
        <div className='font-medium'>{row.original.email}</div>
        <div className='text-xs text-muted-foreground'>{row.original.name}</div>
      </div>
    ),
  },
  {
    header: msg('convites.columns.roles'),
    id: 'roles',
    enableSorting: false,
    cell: ({ row }) => (
      <div className='flex flex-wrap gap-1'>
        {row.original.roles.map((role) => (
          <Badge key={role.id} variant='outline'>
            {role.name}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    header: msg('convites.columns.status'),
    accessorKey: 'status',
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]}>
        <Msg k={`convites.status.${row.original.status}`} />
      </Badge>
    ),
  },
  {
    header: msg('convites.columns.expiresAt'),
    accessorKey: 'expiresAt',
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>{formatDate(row.original.expiresAt)}</span>
    ),
  },
  {
    header: msg('convites.columns.invitedBy'),
    id: 'invitedBy',
    enableSorting: false,
    cell: ({ row }) => (
      <span className='text-sm'>{row.original.invitedBy?.name ?? row.original.invitedBy?.email}</span>
    ),
  },
]

// ============================================================================
// 4. FORM SECTIONS (create dialog)
// ============================================================================
export const formSections: FormSection[] = [
  {
    label: msg('convites.sections.invitee.label'),
    description: msg('convites.sections.invitee.description'),
    grid: '2',
    fields: [
      {
        name: 'email',
        label: msg('convites.fields.email'),
        type: 'email',
        placeholder: msg('convites.fields.emailPlaceholder'),
        required: true,
        focus: true,
      },
      {
        name: 'name',
        label: msg('convites.fields.name'),
        type: 'text',
        description: msg('convites.fields.nameDescription'),
      },
      {
        name: 'roleIds',
        label: msg('convites.fields.roles'),
        type: 'multiselect',
        description: msg('convites.fields.rolesDescription'),
        // Options are domain data (role names), not chrome text.
        loadField: async () => {
          const { data } = await rolesApi.list({ page: 1, pageSize: 100 })
          return data.map((role) => ({ value: role.id, label: role.name }))
        },
        span: '2',
      },
    ],
  },
]

// ============================================================================
// 5. CRUD CONFIG
// ============================================================================
export const convitesConfig: CrudConfig<Invitation, InvitationFormData> = {
  module: {
    name: 'convites',
    title: msg('convites.title'),
    description: msg('convites.description'),
    route: '/admin/convites',
  },

  // No edit or delete: an invitation is resent (new link) or revoked.
  permissions: { create: 'invitations.write' },

  list: {
    title: '',
    description: '',
    searchPlaceholder: msg('convites.searchPlaceholder'),
    columns,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 100,
    toolbar: { counterLabel: msg('convites.counter') },
  },

  form: { sections: formSections, validation: validationSchema },

  query: { queryKey: ['convites'], queryFn: invitationsApi.list, staleTime: 30_000 },

  mutations: {
    create: {
      mutationFn: async (data) => ({
        success: true,
        data: await invitationsApi.create({ ...data, name: data.name || null }),
      }),
      invalidates: [['convites']],
    },
  },

  actionsConfig: {
    // The list refetches after a custom handler succeeds.
    custom: [
      {
        id: 'resend',
        icon: getIcon('Mail'),
        tooltip: msg('convites.actions.resend'),
        permission: 'invitations.write',
        visible: open,
        handler: (row) => invitationsApi.resend(row.id),
        successMessage: msg('convites.actions.resent'),
        confirmDialog: {
          title: (row) => msg('convites.confirmResend.title', { email: row.email }),
          description: msg('convites.confirmResend.description'),
          confirmText: msg('convites.confirmResend.confirmText'),
          cancelText: msg('convites.confirmResend.cancelText'),
        },
      },
      {
        id: 'revoke',
        icon: getIcon('UserX'),
        tooltip: msg('convites.actions.revoke'),
        permission: 'invitations.write',
        visible: open,
        handler: (row) => invitationsApi.revoke(row.id),
        successMessage: msg('convites.actions.revoked'),
        confirmDialog: {
          title: (row) => msg('convites.confirmRevoke.title', { email: row.email }),
          description: msg('convites.confirmRevoke.description'),
          confirmText: msg('convites.confirmRevoke.confirmText'),
          cancelText: msg('convites.confirmRevoke.cancelText'),
          variant: 'destructive',
        },
      },
    ],
  },

  dialogs: {
    create: {
      urlParam: 'create',
      title: msg('convites.dialogs.create.title'),
      description: msg('convites.dialogs.create.description'),
      headerConfig,
      defaultValues: { roleIds: [] },
    },
  },
}
