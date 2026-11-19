import type { Meta, StoryObj } from '@storybook/react'
import { LineChart } from './LineChart'

const meta = {
  title: 'Charts/LineChart',
  component: LineChart,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Gráfico de linha para visualizar tendências e séries temporais.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LineChart>

export default meta
type Story = StoryObj<typeof meta>

// Recharts freezes `data` (immer); stories take copies so switching between
// them in the same preview does not hit an array frozen by the previous one.
const salesData = [
  { name: 'Jan', vendas: 4000, lucro: 2400, custos: 1600 },
  { name: 'Fev', vendas: 3000, lucro: 1398, custos: 1602 },
  { name: 'Mar', vendas: 2000, lucro: 9800, custos: -7800 },
  { name: 'Abr', vendas: 2780, lucro: 3908, custos: -1128 },
  { name: 'Mai', vendas: 1890, lucro: 4800, custos: -2910 },
  { name: 'Jun', vendas: 2390, lucro: 3800, custos: -1410 },
  { name: 'Jul', vendas: 3490, lucro: 4300, custos: -810 },
]

export const Default: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas', 'lucro'],
    colors: ['#3b82f6', '#10b981'],
    height: 300,
    showGrid: true,
    showLegend: true,
  },
}

export const SingleLine: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas'],
    colors: ['#8b5cf6'],
    height: 300,
  },
}

export const MultipleLines: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas', 'lucro', 'custos'],
    colors: ['#3b82f6', '#10b981', '#ef4444'],
    height: 350,
    showGrid: true,
    showLegend: true,
  },
}

export const NoGrid: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas', 'lucro'],
    showGrid: false,
    height: 300,
  },
}

export const NoLegend: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas', 'lucro'],
    showLegend: false,
    height: 300,
  },
}

export const CustomColors: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas', 'lucro'],
    colors: ['#FF6B6B', '#4ECDC4'],
    height: 300,
  },
}

export const Tall: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas', 'lucro'],
    height: 500,
  },
}

const growthData = [
  { name: 'Q1 2024', usuarios: 1200, receita: 45000 },
  { name: 'Q2 2024', usuarios: 1800, receita: 68000 },
  { name: 'Q3 2024', usuarios: 2400, receita: 92000 },
  { name: 'Q4 2024', usuarios: 3200, receita: 125000 },
  { name: 'Q1 2025', usuarios: 4100, receita: 158000 },
]

export const QuarterlyGrowth: Story = {
  args: {
    data: structuredClone(growthData),
    dataKeys: ['usuarios', 'receita'],
    colors: ['#8b5cf6', '#f59e0b'],
    height: 350,
    showGrid: true,
    showLegend: true,
  },
}

export const WithAxisLabels: Story = {
  args: {
    data: structuredClone(salesData),
    dataKeys: ['vendas', 'lucro'],
    colors: ['#3b82f6', '#10b981'],
    height: 300,
    xAxisLabel: 'Meses',
    yAxisLabel: 'Valores (R$)',
  },
}
