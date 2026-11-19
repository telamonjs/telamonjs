import type { Meta, StoryObj } from '@storybook/react'
import { KPICard } from './KPICard'
import {
  Users,
  DollarSign,
  ShoppingCart,
  Activity,
  TrendingUp,
} from 'lucide-react'

const meta = {
  title: 'Charts/KPICard',
  component: KPICard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Card de KPI (Key Performance Indicator) para destacar métricas importantes.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof KPICard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Total de Usuários',
    value: '12,543',
    change: 12.5,
    changeLabel: 'vs. mês anterior',
    icon: <Users className='h-6 w-6' />,
    trend: 'up',
  },
}

export const Success: Story = {
  args: {
    title: 'Receita Mensal',
    value: 'R$ 45.231',
    change: 23.4,
    changeLabel: 'vs. mês anterior',
    icon: <DollarSign className='h-6 w-6' />,
    trend: 'up',
  },
}

export const Error: Story = {
  args: {
    title: 'Taxa de Cancelamento',
    value: '5.2%',
    change: -2.1,
    changeLabel: 'vs. mês anterior',
    icon: <TrendingUp className='h-6 w-6' />,
    trend: 'down',
  },
}

export const Warning: Story = {
  args: {
    title: 'Pedidos Pendentes',
    value: '47',
    change: 8.3,
    changeLabel: 'vs. semana anterior',
    icon: <ShoppingCart className='h-6 w-6' />,
    trend: 'up',
  },
}

export const Neutral: Story = {
  args: {
    title: 'Taxa de Conversão',
    value: '3.24%',
    icon: <Activity className='h-6 w-6' />,
    trend: 'neutral',
  },
}

export const NoChange: Story = {
  args: {
    title: 'Usuários Online',
    value: '1,247',
    icon: <Users className='h-6 w-6' />,
  },
}

export const Loading: Story = {
  args: {
    title: 'Carregando...',
    value: '---',
    loading: true,
    icon: <Users className='h-6 w-6' />,
  },
}

export const WithFooter: Story = {
  args: {
    title: 'Vendas Hoje',
    value: 'R$ 12.450',
    change: 15.2,
    changeLabel: 'vs. ontem',
    icon: <DollarSign className='h-6 w-6' />,
    trend: 'up',
    footer: (
      <div className='text-xs text-muted-foreground'>
        Última atualização: há 5 minutos
      </div>
    ),
  },
}

export const Grid: Story = {
  args: {
    title: 'Grid Example',
    value: '12,543',
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple KPI cards in a grid layout showing different metrics.',
      },
    },
  },
}

export const CompactGrid: Story = {
  args: {
    title: 'Compact Example',
    value: '12.5k',
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact version with minimal information.',
      },
    },
  },
}

export const LargeNumbers: Story = {
  args: {
    title: 'Total de Transações',
    value: '1,234,567',
    change: 8.9,
    changeLabel: 'este ano',
    icon: <Activity className='h-6 w-6' />,
    trend: 'up',
  },
}

export const Percentage: Story = {
  args: {
    title: 'Taxa de Aprovação',
    value: '94.7%',
    change: 2.3,
    changeLabel: 'vs. trimestre anterior',
    icon: <TrendingUp className='h-6 w-6' />,
    trend: 'up',
  },
}
