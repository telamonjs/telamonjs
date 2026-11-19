import type { Meta, StoryObj } from '@storybook/react'
import { ProgressTracker } from './ProgressTracker'

const meta = {
  title: 'Charts/ProgressTracker',
  component: ProgressTracker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Componente para rastrear progresso multi-step (wizard/stepper).',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProgressTracker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    steps: [
      { label: 'Informações', status: 'completed' },
      { label: 'Pagamento', status: 'current' },
      { label: 'Confirmação', status: 'pending' },
    ],
  },
}

export const ThreeSteps: Story = {
  args: {
    steps: [
      { label: 'Cadastro', status: 'completed', description: 'Dados básicos' },
      {
        label: 'Validação',
        status: 'current',
        description: 'Verificar informações',
      },
      { label: 'Finalização', status: 'pending', description: 'Concluir' },
    ],
  },
}

export const FourSteps: Story = {
  args: {
    steps: [
      { label: 'Dados Pessoais', status: 'completed' },
      { label: 'Endereço', status: 'completed' },
      { label: 'Pagamento', status: 'current' },
      { label: 'Confirmação', status: 'pending' },
    ],
  },
}

export const AllCompleted: Story = {
  args: {
    steps: [
      { label: 'Informações', status: 'completed' },
      { label: 'Pagamento', status: 'completed' },
      { label: 'Confirmação', status: 'completed' },
    ],
  },
}

export const FirstStep: Story = {
  args: {
    steps: [
      { label: 'Informações', status: 'current' },
      { label: 'Pagamento', status: 'pending' },
      { label: 'Confirmação', status: 'pending' },
    ],
  },
}

export const Vertical: Story = {
  args: {
    variant: 'vertical',
    steps: [
      {
        label: 'Dados do Cliente',
        status: 'completed',
        description: 'Nome, email e telefone',
      },
      {
        label: 'Endereço de Entrega',
        status: 'completed',
        description: 'CEP, rua, número e complemento',
      },
      {
        label: 'Forma de Pagamento',
        status: 'current',
        description: 'Cartão, boleto ou PIX',
      },
      {
        label: 'Revisão',
        status: 'pending',
        description: 'Confirmar dados e finalizar',
      },
    ],
  },
}

export const Horizontal: Story = {
  args: {
    variant: 'horizontal',
    steps: [
      { label: 'Carrinho', status: 'completed' },
      { label: 'Identificação', status: 'completed' },
      { label: 'Pagamento', status: 'current' },
      { label: 'Confirmação', status: 'pending' },
    ],
  },
}

export const FiveSteps: Story = {
  args: {
    steps: [
      { label: 'Início', status: 'completed' },
      { label: 'Etapa 1', status: 'completed' },
      { label: 'Etapa 2', status: 'completed' },
      { label: 'Etapa 3', status: 'current' },
      { label: 'Finalização', status: 'pending' },
    ],
  },
}

export const OnboardingFlow: Story = {
  args: {
    variant: 'vertical',
    steps: [
      {
        label: 'Bem-vindo',
        status: 'completed',
        description: 'Introdução ao sistema',
      },
      {
        label: 'Configuração',
        status: 'completed',
        description: 'Preferências do usuário',
      },
      { label: 'Tutorial', status: 'current', description: 'Como usar' },
      { label: 'Finalizar', status: 'pending', description: 'Começar a usar' },
    ],
  },
}

export const CheckoutProcess: Story = {
  args: {
    steps: [
      { label: 'Carrinho', status: 'completed' },
      { label: 'Login', status: 'completed' },
      { label: 'Envio', status: 'completed' },
      { label: 'Pagamento', status: 'current' },
      { label: 'Confirmação', status: 'pending' },
    ],
  },
}

export const RegistrationWizard: Story = {
  args: {
    variant: 'vertical',
    steps: [
      { label: 'Conta', status: 'completed', description: 'Criar conta' },
      { label: 'Perfil', status: 'completed', description: 'Dados pessoais' },
      { label: 'Empresa', status: 'current', description: 'Dados da empresa' },
      {
        label: 'Verificação',
        status: 'pending',
        description: 'Validar email',
      },
      { label: 'Concluir', status: 'pending', description: 'Finalizar' },
    ],
  },
}
