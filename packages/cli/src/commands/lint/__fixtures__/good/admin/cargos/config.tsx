'use client'

import { ColumnDef } from '@tanstack/react-table'
import { type CrudConfig, type DialogHeaderConfig, Badge } from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
import { formatDate } from '@/lib/utils'
import { asQueryFn, asCreateFn, badgeField } from '@/lib/crud-helpers'
import {
  getAllCargosPaginated,
  getCargoById,
  createCargoAction,
  updateCargoAction,
  deleteCargoAction,
  type Cargo
} from '@/lib/api/cargos-client'

// Re-export schema para não quebrar outros consumidores
export { validationSchema, type CargoFormData } from './schema'
import { validationSchema, type CargoFormData } from './schema'

// Detail component
import CargoDetail from './_components/CargoDetail'

// ============================================================================
// TYPES
// ============================================================================
export type CargoRow = Cargo

// ============================================================================
// HEADER CONFIG
// ============================================================================
const headerConfig: DialogHeaderConfig<CargoRow> = {
  icon: 'Briefcase',
  iconColor: 'blue',
  title: (item) => item.descricao,
  gradient: 'from-blue-50 to-indigo-50',
  badge: {
    field: badgeField<CargoRow>('ativo'),
    variants: { true: 'default', false: 'secondary' },
    labels: { true: 'Ativo', false: 'Inativo' }
  }
}

// ============================================================================
// COLUMNS
// ============================================================================
const columns: ColumnDef<CargoRow>[] = [
  { header: 'Descrição', accessorKey: 'descricao', enableGlobalFilter: true },
  {
    header: 'Status',
    accessorKey: 'ativo',
    cell: ({ row }) =>
      row.original.ativo ? (
        <Badge variant="default" className="bg-green-600">
          Ativo
        </Badge>
      ) : (
        <Badge variant="secondary">Inativo</Badge>
      )
  },
  {
    header: 'Atualizado em',
    accessorKey: 'updatedAt',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
    )
  }
]

// ============================================================================
// FORM SECTIONS
// ============================================================================
const formSections = [
  {
    label: 'Dados do Cargo',
    grid: '2',
    fields: [
      {
        name: 'descricao',
        label: 'Descrição',
        type: 'text' as const,
        placeholder: 'Ex: Professor Adjunto A',
        required: true,
        focus: true
      },
      { name: 'ativo', label: 'Ativo', type: 'boolean' as const, default: true }
    ]
  }
]

// ============================================================================
// CRUD CONFIG
// ============================================================================
export const cargosConfig: CrudConfig<CargoRow, CargoFormData> = {
  module: {
    name: 'cargos',
    title: 'Cargos',
    description: 'Cadastro de cargos utilizados nas vagas',
    route: '/admin/cargos'
  },

  list: {
    title: '',
    description: '',
    searchPlaceholder: 'Buscar por descrição...',
    columns,
    defaultSortBy: 'descricao',
    defaultSortOrder: 'asc',
    serverSidePagination: true,
    infiniteScroll: true,
    defaultPageSize: 100,
    toolbar: {
      counterLabel: (count: number) => (count === 1 ? 'cargo' : 'cargos')
    }
  },

  form: {
    sections: formSections,
    validation: validationSchema
  },

  query: {
    queryKey: ['cargos'],
    queryFn: asQueryFn<CargoRow>(getAllCargosPaginated),
    staleTime: 30_000
  },

  mutations: {
    create: {
      mutationFn: asCreateFn<CargoRow, CargoFormData>(createCargoAction),
      invalidates: [['cargos']]
    },
    update: {
      mutationFn: ({ id, data }: { id: string; data: Partial<CargoFormData> }) =>
        updateCargoAction(id, data),
      invalidates: [['cargos']]
    },
    delete: {
      mutationFn: ({ id }: { id: string }) => deleteCargoAction(id),
      invalidates: [['cargos']]
    },
    getForEdit: async (id: string): Promise<CargoFormData> => {
      const cargo = await getCargoById(id)
      if (!cargo) throw new Error('Cargo não encontrado')
      return { descricao: cargo.descricao, ativo: cargo.ativo }
    },
    getForView: async (id: string) => {
      const cargo = await getCargoById(id)
      if (!cargo) throw new Error('Cargo não encontrado')
      return cargo
    }
  },

  actionsConfig: {
    standard: {
      view: { icon: getIcon('Eye'), tooltip: 'Ver detalhes' },
      edit: { icon: getIcon('Pencil'), tooltip: 'Editar cargo' },
      delete: {
        icon: getIcon('Trash2'),
        tooltip: 'Excluir cargo',
        confirmDialog: {
          title: (row: CargoRow) => `Excluir cargo ${row.descricao}?`,
          description: () =>
            'Tem certeza que deseja excluir este cargo? Cargos vinculados a vagas não podem ser excluídos.',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          variant: 'destructive' as const
        }
      }
    }
  },

  dialogs: {
    view: {
      urlParam: 'view',
      title: 'Detalhes do Cargo',
      headerConfig,
      renderContent: (item: CargoRow) => <CargoDetail cargo={item} />
    },
    edit: {
      title: 'Editar Cargo',
      description: 'Atualize as informações do cargo',
      headerConfig
    },
    create: {
      title: 'Novo Cargo',
      description: 'Cadastre um novo cargo',
      headerConfig: {
        ...headerConfig,
        title: 'Novo Cargo',
        badge: undefined
      },
      defaultValues: { ativo: true }
    }
  }
}

export { columns, formSections }
