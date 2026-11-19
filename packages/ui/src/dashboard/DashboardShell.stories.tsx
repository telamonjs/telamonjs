import type { Meta, StoryObj } from '@storybook/react'
import { DashboardShell } from './DashboardShell'
import { Truck, Search } from 'lucide-react'
import { StatCard } from '../components/cards'
import { Button } from '../ui/button'

const meta: Meta<typeof DashboardShell> = {
  title: 'Dashboard/DashboardShell',
  component: DashboardShell,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DashboardShell>

// Mock map component
const MockMap = () => (
  <div className='w-full h-full bg-slate-100 rounded-lg flex items-center justify-center border'>
    <div className='text-center'>
      <div className='text-4xl mb-2'>🗺️</div>
      <p className='text-muted-foreground'>Map Component</p>
    </div>
  </div>
)

// Mock grid content
const MockGrid = () => (
  <div className='p-6 space-y-6'>
    <div className='grid grid-cols-4 gap-4'>
      <StatCard icon='activity' label='Total' value={125} color='blue' />
      <StatCard icon='activity' label='Online' value={42} color='green' />
      <StatCard icon='activity' label='Parados' value={8} color='yellow' />
      <StatCard icon='activity' label='Offline' value={3} color='red' />
    </div>
    <div className='grid grid-cols-2 gap-6'>
      <div className='rounded-lg border bg-card p-6 h-64'>
        <h3 className='font-semibold mb-4'>Chart 1</h3>
        <div className='h-full flex items-center justify-center text-muted-foreground'>
          Chart Placeholder
        </div>
      </div>
      <div className='rounded-lg border bg-card p-6 h-64'>
        <h3 className='font-semibold mb-4'>Chart 2</h3>
        <div className='h-full flex items-center justify-center text-muted-foreground'>
          Chart Placeholder
        </div>
      </div>
    </div>
  </div>
)

/**
 * Default map mode with fullHeight layout.
 * Fixed viewport height ideal for maps and real-time UIs.
 */
export const MapMode: Story = {
  args: {
    title: 'Meu Estoque',
    description: 'Monitoramento em tempo real',
    icon: Truck,
    status: 'online',
    statusLabel: '42 produtos online',
    autoRefresh: true,
    autoRefreshInterval: 120000, // 2 minutes
    allowFullscreen: true,
    fullHeight: true,
    children: (
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4'>
        <div className='rounded-lg border overflow-hidden'>
          <MockMap />
        </div>
        <div className='flex flex-col gap-3 overflow-auto custom-scrollbar'>
          <div className='grid grid-cols-4 gap-2'>
            <StatCard icon='activity'
              label='Online'
              value={42}
              color='green'
              animate
            />
            <StatCard icon='activity' label='Parados' value={8} color='yellow' />
            <StatCard icon='activity' label='Offline' value={3} color='red' />
            <StatCard icon='activity' label='Total' value={53} color='blue' />
          </div>
          <div className='rounded-lg border bg-card p-4'>
            <h3 className='font-semibold mb-2'>Produtos</h3>
            <div className='space-y-2'>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className='p-2 border rounded text-sm'>
                  Produto {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
}

/**
 * Scroll mode with natural page scroll.
 * Ideal for executive dashboards and report grids.
 */
export const ScrollMode: Story = {
  args: {
    title: 'Dashboard Executivo',
    description: 'Visão geral de métricas',
    status: 'online',
    autoRefresh: false,
    allowFullscreen: true,
    fullHeight: false, // Natural scroll
    children: <MockGrid />,
  },
}

/**
 * With search functionality.
 * Header includes search input for filtering content.
 */
export const WithSearch: Story = {
  args: {
    title: 'Meu Estoque',
    icon: Truck,
    status: 'online',
    searchPlaceholder: 'Buscar produto...',
    searchValue: '',
    onSearchChange: (value: string) => {
      console.log('Search:', value)
    },
    autoRefresh: true,
    allowFullscreen: true,
    fullHeight: true,
    children: (
      <div className='p-4'>
        <MockMap />
      </div>
    ),
  },
}

/**
 * Without fullscreen capability.
 * Simplified dashboard without fullscreen toggle.
 */
export const WithoutFullscreen: Story = {
  args: {
    title: 'Dashboard Simples',
    status: 'online',
    autoRefresh: true,
    allowFullscreen: false, // No fullscreen
    fullHeight: false,
    children: <MockGrid />,
  },
}

/**
 * With custom actions in header.
 * Demonstrates adding custom buttons and controls.
 */
export const WithCustomActions: Story = {
  args: {
    title: 'Dashboard Avançado',
    icon: Truck,
    status: 'online',
    statusLabel: 'Sistema operacional',
    autoRefresh: true,
    allowFullscreen: true,
    fullHeight: true,
    actions: (
      <>
        <Button variant='outline' size='sm' className='h-7 gap-1.5 px-2.5'>
          <Search className='h-3.5 w-3.5' />
          <span className='hidden sm:inline text-xs'>Filtrar</span>
        </Button>
        <Button variant='default' size='sm' className='h-7 gap-1.5 px-2.5'>
          <span className='text-xs'>Exportar</span>
        </Button>
      </>
    ),
    children: (
      <div className='p-4'>
        <MockMap />
      </div>
    ),
  },
}
