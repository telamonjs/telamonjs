import type { Meta, StoryObj } from '@storybook/react'
import {
  ComparisonTable,
  ComparisonColumn,
  ComparisonRow,
} from './ComparisonTable'

const meta = {
  title: 'Charts/ComparisonTable',
  component: ComparisonTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Tabela de comparação para análise lado a lado de múltiplos itens e métricas.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ComparisonTable>

export default meta
type Story = StoryObj<typeof meta>

// Define columns
const plansColumns: ComparisonColumn[] = [
  { label: 'Plano Básico', key: 'basic' },
  { label: 'Plano Pro', key: 'pro', highlight: true, badge: 'Popular' },
  { label: 'Plano Enterprise', key: 'enterprise' },
]

// Define rows
const plansRows: ComparisonRow[] = [
  { feature: 'Usuários', basic: '5', pro: '20', enterprise: 'Ilimitado' },
  { feature: 'Storage (GB)', basic: 10, pro: 100, enterprise: 1000 },
  {
    feature: 'Suporte',
    basic: '8x5',
    pro: '24x7',
    enterprise: '24x7 Priority',
  },
  { feature: 'API Access', basic: false, pro: true, enterprise: true },
  { feature: 'Custom Domain', basic: false, pro: true, enterprise: true },
  { feature: 'Analytics', basic: false, pro: false, enterprise: true },
]

export const Default: Story = {
  args: {
    columns: plansColumns,
    rows: plansRows,
  },
}

// Product comparison
const productsColumns: ComparisonColumn[] = [
  { label: 'Produto A', key: 'prodA' },
  { label: 'Produto B', key: 'prodB' },
  { label: 'Produto C', key: 'prodC' },
  { label: 'Produto D', key: 'prodD' },
]

const productsRows: ComparisonRow[] = [
  {
    feature: 'Vendas Mensais',
    category: 'Desempenho',
    prodA: 'R$ 15.000',
    prodB: 'R$ 22.000',
    prodC: 'R$ 8.000',
    prodD: 'R$ 18.500',
  },
  {
    feature: 'Margem (%)',
    category: 'Desempenho',
    prodA: 35,
    prodB: 28,
    prodC: 42,
    prodD: 31,
  },
  {
    feature: 'Estoque',
    category: 'Logística',
    prodA: 450,
    prodB: 120,
    prodC: 890,
    prodD: 320,
  },
  {
    feature: 'Avaliação',
    category: 'Qualidade',
    prodA: '4.5/5',
    prodB: '4.8/5',
    prodC: '4.1/5',
    prodD: '4.6/5',
  },
]

export const ProductComparison: Story = {
  args: {
    columns: productsColumns,
    rows: productsRows,
  },
}

// Competitor analysis
const competitorsColumns: ComparisonColumn[] = [
  { label: 'Nossa Empresa', key: 'us', highlight: true },
  { label: 'Concorrente A', key: 'compA' },
  { label: 'Concorrente B', key: 'compB' },
  { label: 'Concorrente C', key: 'compC' },
]

const competitorsRows: ComparisonRow[] = [
  {
    feature: 'Market Share (%)',
    category: 'Mercado',
    us: 25,
    compA: 35,
    compB: 20,
    compC: 15,
  },
  {
    feature: 'Crescimento Anual (%)',
    category: 'Mercado',
    us: 15,
    compA: 8,
    compB: 12,
    compC: 5,
  },
  {
    feature: 'NPS Score',
    category: 'Satisfação',
    us: 72,
    compA: 65,
    compB: 58,
    compC: 61,
  },
  {
    feature: 'Preço Médio',
    category: 'Financeiro',
    us: 'R$ 99',
    compA: 'R$ 129',
    compB: 'R$ 89',
    compC: 'R$ 149',
  },
]

export const CompetitorAnalysis: Story = {
  args: {
    columns: competitorsColumns,
    rows: competitorsRows,
  },
}

// Team metrics
const teamsColumns: ComparisonColumn[] = [
  { label: 'Time Frontend', key: 'frontend' },
  { label: 'Time Backend', key: 'backend' },
  { label: 'Time Mobile', key: 'mobile' },
]

const teamsRows: ComparisonRow[] = [
  {
    feature: 'Velocidade (pontos)',
    frontend: 42,
    backend: 38,
    mobile: 35,
  },
  {
    feature: 'Bugs Abertos',
    frontend: 3,
    backend: 5,
    mobile: 2,
  },
  {
    feature: 'Code Coverage (%)',
    frontend: 87,
    backend: 92,
    mobile: 78,
  },
  {
    feature: 'Deploys/mês',
    frontend: 24,
    backend: 18,
    mobile: 12,
  },
]

export const TeamMetrics: Story = {
  args: {
    columns: teamsColumns,
    rows: teamsRows,
  },
}

export const TwoColumns: Story = {
  args: {
    columns: plansColumns.slice(0, 2),
    rows: plansRows,
  },
}

export const ManyColumns: Story = {
  args: {
    columns: [
      ...plansColumns,
      { label: 'Plano Startup', key: 'startup' },
      { label: 'Plano Scale', key: 'scale' },
    ],
    rows: plansRows.map(row => ({
      ...row,
      startup: row.pro,
      scale: row.enterprise,
    })),
  },
}

export const WithStickyHeader: Story = {
  args: {
    columns: productsColumns,
    rows: productsRows,
    stickyHeader: true,
  },
}
