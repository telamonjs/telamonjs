import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente de botão versátil com múltiplas variações de estilo e tamanho.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
      description: 'Variação visual do botão',
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Tamanho do botão',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado desabilitado do botão',
    },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button',
    onClick: fn(),
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
    onClick: fn(),
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
    onClick: fn(),
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
    onClick: fn(),
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
    onClick: fn(),
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
    onClick: fn(),
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
    onClick: fn(),
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
    onClick: fn(),
  },
}

export const Icon: Story = {
  args: {
    size: 'icon',
    children: '🔥',
    onClick: fn(),
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
    onClick: fn(),
  },
}

// Story with all button variants
export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Button onClick={fn()}>Default</Button>
      <Button variant='secondary' onClick={fn()}>
        Secondary
      </Button>
      <Button variant='destructive' onClick={fn()}>
        Destructive
      </Button>
      <Button variant='outline' onClick={fn()}>
        Outline
      </Button>
      <Button variant='ghost' onClick={fn()}>
        Ghost
      </Button>
      <Button variant='link' onClick={fn()}>
        Link
      </Button>
    </div>
  ),
}

// Story with all sizes
export const AllSizes: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Button size='sm' onClick={fn()}>
        Small
      </Button>
      <Button onClick={fn()}>Default</Button>
      <Button size='lg' onClick={fn()}>
        Large
      </Button>
      <Button size='icon' onClick={fn()}>
        🔥
      </Button>
    </div>
  ),
}
