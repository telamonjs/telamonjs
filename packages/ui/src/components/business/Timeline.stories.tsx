import type { Meta, StoryObj } from '@storybook/react'
import { Timeline } from './Timeline'

const meta = {
  title: 'Business/Timeline',
  component: Timeline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Timeline

Componente para exibir linha do tempo de eventos com suporte a variantes visuais e orientações.

## Features

- ✅ **Vertical & Horizontal** - Duas orientações de layout
- ✅ **Variantes** - success, warning, error, default
- ✅ **Ícones customizados** - Suporte a Lucide icons
- ✅ **Usuário/Avatar** - Mostra quem realizou a ação
- ✅ **Timestamps** - Data/hora formatada automaticamente
- ✅ **Connector lines** - Linhas conectoras entre eventos

## Quick Start

\`\`\`typescript
import { Timeline } from '@telamonjs/ui'
import { CheckCircle } from 'lucide-react'

<Timeline
  items={[
    {
      id: '1',
      title: 'Pedido criado',
      description: 'Pedido #1234 foi criado com sucesso',
      timestamp: new Date(),
      user: { name: 'João Silva', avatar: '/avatar.jpg' },
      icon: <CheckCircle size={16} />,
      variant: 'success'
    }
  ]}
/>
\`\`\`

## Variants

- **default** - Azul (informativo)
- **success** - Verde (sucesso)
- **warning** - Amarelo (atenção)
- **error** - Vermelho (erro)
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'Account created',
        description: 'User registered successfully',
        timestamp: new Date('2024-01-01T10:00:00'),
        variant: 'success',
        user: { name: 'System' },
      },
      {
        id: '2',
        title: 'Document uploaded',
        description: 'Contract_2024.pdf',
        timestamp: new Date('2024-01-02T14:30:00'),
        variant: 'default',
        user: { name: 'John Doe' },
      },
      {
        id: '3',
        title: 'Approved',
        description: 'Document approved by manager',
        timestamp: new Date('2024-01-03T09:15:00'),
        variant: 'success',
        user: { name: 'Jane Smith' },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Default vertical timeline with 3 events.',
      },
    },
  },
}

export const Horizontal: Story = {
  args: {
    variant: 'horizontal',
    items: [
      {
        id: '1',
        title: 'Order Placed',
        description: 'Customer placed order',
        timestamp: new Date('2024-01-01T10:00:00'),
        variant: 'default',
      },
      {
        id: '2',
        title: 'Processing',
        description: 'Order is being processed',
        timestamp: new Date('2024-01-02T11:00:00'),
        variant: 'warning',
      },
      {
        id: '3',
        title: 'Shipped',
        description: 'Order has been shipped',
        timestamp: new Date('2024-01-03T15:00:00'),
        variant: 'success',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Horizontal timeline for process tracking.',
      },
    },
  },
}

export const WithErrors: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'Payment Initiated',
        description: 'User started payment process',
        timestamp: new Date('2024-01-01T10:00:00'),
        variant: 'default',
        user: { name: 'John Doe' },
      },
      {
        id: '2',
        title: 'Payment Failed',
        description: 'Card declined by bank',
        timestamp: new Date('2024-01-01T10:05:00'),
        variant: 'error',
        user: { name: 'Payment System' },
      },
      {
        id: '3',
        title: 'Retry Attempt',
        description: 'User attempting payment again',
        timestamp: new Date('2024-01-01T10:10:00'),
        variant: 'warning',
        user: { name: 'John Doe' },
      },
      {
        id: '4',
        title: 'Payment Successful',
        description: 'Payment completed successfully',
        timestamp: new Date('2024-01-01T10:15:00'),
        variant: 'success',
        user: { name: 'Payment System' },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline showing error states and recovery.',
      },
    },
  },
}

export const NoConnector: Story = {
  args: {
    showConnector: false,
    items: [
      {
        id: '1',
        title: 'Event 1',
        description: 'First event',
        timestamp: new Date('2024-01-01'),
        variant: 'default',
      },
      {
        id: '2',
        title: 'Event 2',
        description: 'Second event',
        timestamp: new Date('2024-01-02'),
        variant: 'success',
      },
      {
        id: '3',
        title: 'Event 3',
        description: 'Third event',
        timestamp: new Date('2024-01-03'),
        variant: 'warning',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline without connector lines between events.',
      },
    },
  },
}

export const MinimalEvents: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'Simple Event',
        timestamp: new Date(),
        variant: 'default',
      },
      {
        id: '2',
        title: 'Another Event',
        timestamp: new Date(),
        variant: 'success',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal timeline with only titles and timestamps.',
      },
    },
  },
}
