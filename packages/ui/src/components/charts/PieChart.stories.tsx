import type { Meta, StoryObj } from '@storybook/react'
import { PieChart } from './PieChart'

const meta = {
  title: 'Charts/PieChart',
  component: PieChart,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Gráfico de pizza para visualizar proporções e distribuição percentual.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PieChart>

export default meta
type Story = StoryObj<typeof meta>

const trafficData = [
  { name: 'Desktop', value: 45 },
  { name: 'Mobile', value: 35 },
  { name: 'Tablet', value: 20 },
]

export const Default: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
    height: 300,
    showLabels: true,
    showLegend: true,
  },
}

export const DonutChart: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
    height: 300,
    innerRadius: 60,
    showLabels: true,
    showLegend: true,
  },
}

export const NoLabels: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
    showLabels: false,
    showLegend: true,
    height: 300,
  },
}

export const NoLegend: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
    showLabels: true,
    showLegend: false,
    height: 300,
  },
}

const revenueData = [
  { name: 'Plano Básico', value: 45000 },
  { name: 'Plano Pro', value: 35500 },
  { name: 'Plano Enterprise', value: 23900 },
  { name: 'Add-ons', value: 12600 },
]

export const RevenueDistribution: Story = {
  args: {
    data: revenueData,
    dataKey: 'value',
    colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
    height: 350,
    showLabels: true,
    showLegend: true,
  },
}

const marketShareData = [
  { name: 'Nossa Empresa', value: 25 },
  { name: 'Concorrente A', value: 35 },
  { name: 'Concorrente B', value: 20 },
  { name: 'Concorrente C', value: 15 },
  { name: 'Outros', value: 5 },
]

export const MarketShare: Story = {
  args: {
    data: marketShareData,
    dataKey: 'value',
    colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'],
    height: 350,
    innerRadius: 70,
  },
}

const statusData = [
  { name: 'Concluído', value: 142 },
  { name: 'Em Andamento', value: 38 },
  { name: 'Pendente', value: 25 },
  { name: 'Cancelado', value: 7 },
]

export const TaskStatus: Story = {
  args: {
    data: statusData,
    dataKey: 'value',
    colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
    height: 300,
  },
}

const salesData = [
  { name: 'Norte', value: 12500 },
  { name: 'Sul', value: 18900 },
  { name: 'Leste', value: 15600 },
  { name: 'Oeste', value: 14200 },
  { name: 'Centro', value: 10800 },
]

export const RegionalSales: Story = {
  args: {
    data: salesData,
    dataKey: 'value',
    colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
    height: 350,
    innerRadius: 50,
  },
}

export const CustomColors: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    height: 300,
  },
}

export const Small: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
    height: 200,
    showLabels: false,
  },
}

export const Large: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
    height: 500,
    innerRadius: 100,
  },
}

const twoItemsData = [
  { name: 'Sim', value: 73 },
  { name: 'Não', value: 27 },
]

export const TwoItems: Story = {
  args: {
    data: twoItemsData,
    dataKey: 'value',
    colors: ['#10b981', '#ef4444'],
    height: 300,
  },
}

const manyItemsData = [
  { name: 'A', value: 18 },
  { name: 'B', value: 15 },
  { name: 'C', value: 13 },
  { name: 'D', value: 12 },
  { name: 'E', value: 10 },
  { name: 'F', value: 9 },
  { name: 'G', value: 8 },
  { name: 'H', value: 7 },
  { name: 'I', value: 5 },
  { name: 'Outros', value: 3 },
]

export const ManyItems: Story = {
  args: {
    data: manyItemsData,
    dataKey: 'value',
    height: 400,
    showLabels: false,
    showLegend: true,
  },
}

export const SideBySide: Story = {
  args: {
    data: trafficData,
    dataKey: 'value',
  },
  render: () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div>
        <h3 className='text-lg font-semibold mb-4'>Q1 2025</h3>
        <PieChart
          data={trafficData}
          dataKey='value'
          colors={['#3b82f6', '#10b981', '#f59e0b']}
          height={250}
        />
      </div>
      <div>
        <h3 className='text-lg font-semibold mb-4'>Q2 2025</h3>
        <PieChart
          data={[
            { name: 'Desktop', value: 40 },
            { name: 'Mobile', value: 42 },
            { name: 'Tablet', value: 18 },
          ]}
          dataKey='value'
          colors={['#3b82f6', '#10b981', '#f59e0b']}
          height={250}
        />
      </div>
    </div>
  ),
}
