import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { SubList } from './sub-list'
import { SubListSkeleton } from './sub-list-skeleton'
import { EmptyState } from './empty-state'
import { Users, FileText } from 'lucide-react'

const meta = {
  title: 'Components/SubList',
  component: SubList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Componente de lista com operações CRUD. UI profissional inspirada em apps como Linear, Notion e Figma.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    loadFn: { action: 'load' },
    deleteFn: { action: 'delete' },
    listFields: {
      control: 'object',
      description: 'Configuração dos campos da tabela',
    },
    data: {
      control: 'object',
      description: 'Dados a serem exibidos na tabela',
    },
    manyToMany: {
      control: 'boolean',
      description: 'Indica se é uma relação muitos-para-muitos',
    },
    emptyState: {
      control: 'object',
      description: 'Configuração do estado vazio',
    },
  },
} satisfies Meta<typeof SubList>

export default meta
type Story = StoryObj<typeof meta>

// Sample data
const sampleUsers = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@example.com',
    department: 'TI',
    active: true,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@example.com',
    department: 'RH',
    active: true,
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'pedro@example.com',
    department: 'Vendas',
    active: false,
    createdAt: '2024-01-05',
  },
]

const userFields = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'department',
    header: 'Departamento',
  },
  {
    accessorKey: 'active',
    header: 'Ativo',
  },
  {
    accessorKey: 'createdAt',
    header: 'Criado em',
  },
]

// Basic story - view only
export const BasicList: Story = {
  args: {
    listFields: userFields,
    data: sampleUsers,
  },
}

// Story with edit and delete actions (shows hover effects)
export const WithActions: Story = {
  args: {
    listFields: userFields,
    data: sampleUsers,
    loadFn: fn((id: string) => {
      console.log('Load user:', id)
    }),
    deleteFn: fn((rowIdOrParams: string | { id: string; parentId: string }) => {
      const id =
        typeof rowIdOrParams === 'string' ? rowIdOrParams : rowIdOrParams.id
      console.log('Delete user:', id)
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Passe o mouse sobre as linhas para ver os botões de ação com efeitos de hover elegantes.',
      },
    },
  },
}

// Story with empty list - shows the elegant EmptyState
export const EmptyList: Story = {
  args: {
    listFields: userFields,
    data: [],
    loadFn: fn(),
    deleteFn: fn(),
    emptyState: {
      title: 'Nenhum usuário encontrado',
      description: 'Comece adicionando o primeiro usuário.',
      actionLabel: 'Adicionar Usuário',
      onAction: fn(() => console.log('Add user clicked')),
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Estado vazio com ícone animado, gradiente e botão de ação. Inspirado em apps modernos.',
      },
    },
  },
}

// Story with view action only
export const ReadOnlyList: Story = {
  args: {
    listFields: userFields,
    data: sampleUsers,
    loadFn: fn((id: string) => {
      console.log('View user:', id)
    }),
  },
}

// Story with custom fields (badges, links)
export const CustomFields: Story = {
  args: {
    listFields: [
      {
        accessorKey: 'name',
        header: 'Nome Completo',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.original.active
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
            }`}
          >
            {row.original.active ? 'Ativo' : 'Inativo'}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Contato',
        cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
          <a
            href={`mailto:${String(row.original.email ?? '')}`}
            className='text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400'
          >
            {String(row.original.email ?? '')}
          </a>
        ),
      },
    ],
    data: sampleUsers,
    loadFn: fn(),
    deleteFn: fn(),
  },
}

// Story with more data to test scrolling and pagination
export const LargeDataset: Story = {
  args: {
    listFields: userFields,
    data: Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Usuário ${i + 1}`,
      email: `usuario${i + 1}@example.com`,
      department: ['TI', 'RH', 'Vendas', 'Marketing'][i % 4],
      active: i % 3 !== 0,
      createdAt: new Date(2024, 0, i + 1).toISOString().split('T')[0],
    })),
    loadFn: fn(),
    deleteFn: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Lista com muitos dados mostrando paginação estilo Linear com seletor de itens por página.',
      },
    },
  },
}

// Story for many-to-many relation
export const ManyToMany: Story = {
  args: {
    listFields: [
      {
        accessorKey: 'name',
        header: 'Projeto',
      },
      {
        accessorKey: 'role',
        header: 'Função',
      },
      {
        accessorKey: 'startDate',
        header: 'Data Início',
      },
    ],
    data: [
      {
        id: '1',
        name: 'Sistema de Vendas',
        role: 'Desenvolvedor',
        startDate: '2024-01-01',
      },
      {
        id: '2',
        name: 'App Mobile',
        role: 'Tech Lead',
        startDate: '2024-02-01',
      },
      {
        id: '3',
        name: 'Dashboard Analytics',
        role: 'Desenvolvedor',
        startDate: '2024-03-01',
      },
    ],
    loadFn: fn(),
    deleteFn: fn(),
    manyToMany: true,
  },
}

// ============================================================================
// SKELETON STORIES
// ============================================================================

export const SkeletonLoading: StoryObj<typeof SubListSkeleton> = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-sm font-medium mb-3'>
          Desktop Skeleton (5 colunas)
        </h3>
        <SubListSkeleton columns={5} rows={5} showToolbar={true} />
      </div>
      <div>
        <h3 className='text-sm font-medium mb-3'>
          Compact Skeleton (3 colunas)
        </h3>
        <SubListSkeleton columns={3} rows={3} showToolbar={false} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Skeleton loading com animação staggered. Usado automaticamente pelo CrudField durante carregamento.',
      },
    },
  },
}

// ============================================================================
// EMPTY STATE STORIES
// ============================================================================

export const EmptyStateVariants: StoryObj<typeof EmptyState> = {
  render: () => (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      <div className='border rounded-lg p-4'>
        <EmptyState
          title='Nenhum usuário'
          description='Adicione o primeiro usuário ao sistema.'
          action={{
            label: 'Adicionar',
            onClick: () => console.log('Add'),
          }}
        />
      </div>
      <div className='border rounded-lg p-4'>
        <EmptyState
          icon={<Users className='h-7 w-7 text-muted-foreground/70' />}
          title='Sem membros'
          description='Convide pessoas para participar.'
          action={{
            label: 'Convidar',
            onClick: () => console.log('Invite'),
          }}
        />
      </div>
      <div className='border rounded-lg p-4'>
        <EmptyState
          icon={<FileText className='h-7 w-7 text-muted-foreground/70' />}
          title='Sem documentos'
          description='Nenhum documento foi enviado ainda.'
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Variações do EmptyState com diferentes ícones e configurações. Suporta ícone customizado e ação opcional.',
      },
    },
  },
}

// Story demonstrating zebra striping and hover
export const ZebraAndHover: Story = {
  args: {
    listFields: userFields,
    data: Array.from({ length: 8 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Usuário ${i + 1}`,
      email: `usuario${i + 1}@example.com`,
      department: ['TI', 'RH', 'Vendas', 'Marketing'][i % 4],
      active: i % 2 === 0,
      createdAt: new Date(2024, 0, i + 1).toISOString().split('T')[0],
    })),
    loadFn: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstra zebra striping (linhas alternadas) e efeitos de hover elegantes. Linhas ímpares têm fundo levemente colorido.',
      },
    },
  },
}
