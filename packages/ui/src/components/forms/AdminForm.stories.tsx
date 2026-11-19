import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { AdminForm } from './AdminForm'

const meta = {
  title: 'Forms/AdminForm',
  component: AdminForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# AdminForm

Componente para criar formulários declarativos com validação Zod e suporte a múltiplos tipos de campos.

## Features

- ✅ **Auto-geração de fields** - Define campos via config objeto
- ✅ **Validação real-time** - Integração com Zod schemas
- ✅ **Suporte a nested data** - Relacionamentos e campos complexos
- ✅ **Multi-step wizard** - Formulários em etapas (tabs)
- ✅ **20+ field types** - Text, email, relationship, masked, etc.
- ✅ **Server Actions** - Integração nativa com Next.js 15

## Quick Start

\`\`\`typescript
import { Form } from '@telamonjs/ui'
import { z } from 'zod'

const validationSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido')
})

const formSections: FormSection[] = [
  {
    label: 'Dados Pessoais',
    fields: [
      { name: 'name', label: 'Nome', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true }
    ]
  }
]

<Form
  sections={formSections}
  action={handleSubmit}
  validation={validationSchema}
/>
\`\`\`

## Field Types

- **Text inputs**: \`text\`, \`email\`, \`password\`, \`number\`, \`float\`, \`textarea\`
- **Boolean**: \`boolean\`, \`checkbox\`
- **Date/Time**: \`date\`, \`datetime\`, \`masked-datetime\`
- **Selection**: \`relationship\`, \`multiselect\`
- **Upload**: \`image\`, \`file\`
- **Special**: \`masked\`, \`svg\`, \`component\`, \`crud\`

## Examples

Explore the stories below to see AdminForm in action with various configurations.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    action: { action: 'submitted' },
    cancelAction: { action: 'cancelled' },
    fields: {
      control: 'object',
      description: 'Array de configurações de campos do formulário',
    },
    data: {
      control: 'object',
      description: 'Dados iniciais para pré-popular o formulário',
    },
    submitText: {
      control: 'text',
      description: 'Texto do botão de submissão',
    },
  },
} satisfies Meta<typeof AdminForm>

export default meta
type Story = StoryObj<typeof meta>

// Basic story
export const BasicForm: Story = {
  args: {
    fields: [
      {
        name: 'name',
        label: 'Nome Completo',
        type: 'text',
        required: true,
        placeholder: 'Digite seu nome',
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'seu@email.com',
      },
      {
        name: 'age',
        label: 'Idade',
        type: 'number',
        placeholder: 'Sua idade',
      },
    ],
    submitText: 'Enviar',
    action: fn(async (formData: FormData) => {
      // Mock action for demonstration
      // All fields in this form are text — File never occurs here
      const data: Record<string, string> = {}
      for (const [key, value] of formData.entries()) {
        data[key] = typeof value === 'string' ? value : value.name
      }
      console.log('Form submitted:', data)
      return { success: true }
    }),
  },
}

// Story with prefilled data
export const PrefilledForm: Story = {
  args: {
    fields: [
      {
        name: 'name',
        label: 'Nome Completo',
        type: 'text',
        required: true,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
      },
      {
        name: 'bio',
        label: 'Biografia',
        type: 'textarea',
        placeholder: 'Conte sobre você...',
      },
      {
        name: 'active',
        label: 'Usuário Ativo',
        type: 'boolean',
      },
    ],
    data: {
      name: 'João Silva',
      email: 'joao@example.com',
      bio: 'Desenvolvedor apaixonado por tecnologia.',
      active: true,
    },
    submitText: 'Atualizar',
    action: fn(),
  },
}

// Story with advanced fields
export const AdvancedFields: Story = {
  args: {
    fields: [
      {
        name: 'name',
        label: 'Nome',
        type: 'text',
        required: true,
      },
      {
        name: 'category',
        label: 'Categoria',
        type: 'multiselect',
        required: true,
        loadField: async () => [
          { value: 'dev', label: 'Desenvolvedor' },
          { value: 'design', label: 'Designer' },
          { value: 'pm', label: 'Product Manager' },
        ],
      },
      {
        name: 'skills',
        label: 'Habilidades',
        type: 'multiselect',
        loadField: async () => [
          { value: 'javascript', label: 'JavaScript' },
          { value: 'typescript', label: 'TypeScript' },
          { value: 'react', label: 'React' },
          { value: 'nodejs', label: 'Node.js' },
        ],
      },
      {
        name: 'birthDate',
        label: 'Data de Nascimento',
        type: 'date',
        required: true,
      },
      {
        name: 'phone',
        label: 'Telefone',
        type: 'masked',
        maskType: 'tel',
        placeholder: '(11) 99999-9999',
      },
    ],
    submitText: 'Cadastrar',
    action: fn(),
  },
}

// Story with validation
export const ValidationForm: Story = {
  args: {
    fields: [
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        placeholder: 'Digite um email válido',
      },
      {
        name: 'password',
        label: 'Senha',
        type: 'password',
        required: true,
        placeholder: 'Mínimo 8 caracteres',
      },
      {
        name: 'confirmPassword',
        label: 'Confirmar Senha',
        type: 'password',
        required: true,
        placeholder: 'Repita a senha',
      },
    ],
    submitText: 'Validar',
    action: fn(async (formData: FormData) => {
      // Simulate validation
      // All fields in this form are text — File never occurs here
      const data: Record<string, string> = {}
      for (const [key, value] of formData.entries()) {
        data[key] = typeof value === 'string' ? value : value.name
      }

      if (data.password !== data.confirmPassword) {
        throw new Error('Senhas não coincidem')
      }

      if (data.password.length < 8) {
        throw new Error('Senha deve ter pelo menos 8 caracteres')
      }

      return { success: true }
    }),
  },
}

// Story with cancel action
export const FormWithCancel: Story = {
  args: {
    fields: [
      {
        name: 'title',
        label: 'Título',
        type: 'text',
        required: true,
      },
      {
        name: 'description',
        label: 'Descrição',
        type: 'textarea',
        placeholder: 'Descreva o item...',
      },
    ],
    submitText: 'Salvar',
    action: fn(),
    cancelAction: fn(),
  },
}

// Story with file upload
export const FileUploadForm: Story = {
  args: {
    fields: [
      {
        name: 'name',
        label: 'Nome do Arquivo',
        type: 'text',
        required: true,
      },
      {
        name: 'document',
        label: 'Documento',
        type: 'file',
        path: '/uploads',
      },
      {
        name: 'avatar',
        label: 'Avatar',
        type: 'image',
      },
      {
        name: 'icon',
        label: 'Ícone SVG',
        type: 'svg',
        placeholder: 'Cole o código SVG aqui...',
      },
    ],
    submitText: 'Upload',
    action: fn(),
  },
}
