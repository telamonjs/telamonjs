import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { CreateForm } from './CreateForm'
import type { FormSection } from '../../types/forms/admin-form'
import { z } from 'zod'

const validationSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

const basicSections: FormSection[] = [
  {
    label: 'Dados Pessoais',
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
        name: 'password',
        label: 'Senha',
        type: 'password',
        required: true,
        placeholder: 'Mínimo 8 caracteres',
      },
    ],
  },
]

const sectionsWithEditOnly: FormSection[] = [
  {
    label: 'Dados Básicos',
    fields: [
      {
        name: 'name',
        label: 'Nome',
        type: 'text',
        required: true,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
      },
    ],
  },
  {
    label: 'Informações de Sistema',
    fields: [
      {
        name: 'createdAt',
        label: 'Criado em',
        type: 'date',
        editOnly: true, // Should NOT appear in CreateForm
      },
      {
        name: 'updatedAt',
        label: 'Atualizado em',
        type: 'date',
        editOnly: true, // Should NOT appear in CreateForm
      },
    ],
  },
]

const meta = {
  title: 'Forms/CreateForm',
  component: CreateForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# CreateForm

Semantic wrapper para formulários de **criação**. Automaticamente filtra campos com \`editOnly: true\`.

## Features

- ✅ **Auto-filtra editOnly** - Campos como "Criado em" não aparecem
- ✅ **Semantic naming** - \`defaultValues\` ao invés de \`data\`
- ✅ **Submit button text** - Default: "Criar"
- ✅ **Same API as AdminForm** - Mesmas props de validation, sections, etc.

## Quick Start

\`\`\`typescript
import { CreateForm } from '@telamonjs/ui'

<CreateForm
  sections={formSections}
  action={createUser}
  validation={validationSchema}
  defaultValues={{ active: true }}
/>
\`\`\`

## When to Use

- ✅ **Always use on /adicionar pages** (creation routes)
- ✅ When you want to pre-fill some fields with defaults
- ✅ When form has editOnly fields that shouldn't show during creation
- ❌ Don't use for edit pages (use EditForm instead)
- ❌ Don't use for generic forms (use Form/AdminForm)

## editOnly Filter

CreateForm automatically filters out fields with \`editOnly: true\`:

\`\`\`typescript
const sections = [
  {
    fields: [
      { name: 'name', type: 'text' },      // ✅ Shows
      { name: 'createdAt', type: 'date', editOnly: true }  // ❌ Hidden
    ]
  }
]
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CreateForm>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    sections: basicSections,
    validation: validationSchema,
    action: fn(async (formData: FormData) => {
      const data: Record<string, FormDataEntryValue> = {}
      for (const [key, value] of formData.entries()) {
        data[key] = value
      }
      console.log('CreateForm submitted:', data)
      return { success: true, message: 'Usuário criado com sucesso!' }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic CreateForm with name, email and password fields.',
      },
    },
  },
}

export const WithDefaultValues: Story = {
  args: {
    sections: [
      {
        label: 'Dados do Usuário',
        fields: [
          { name: 'name', label: 'Nome', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          {
            name: 'role',
            label: 'Perfil',
            type: 'relationship',
            loadField: async () => [
              { value: 'user', label: 'Usuário' },
              { value: 'admin', label: 'Administrador' },
            ],
          },
          {
            name: 'active',
            label: 'Ativo',
            type: 'boolean',
          },
        ],
      },
    ],
    defaultValues: {
      role: 'user',
      active: true,
    },
    action: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'CreateForm with defaultValues pre-filling role="user" and active=true.',
      },
    },
  },
}

export const FiltersEditOnlyFields: Story = {
  args: {
    sections: sectionsWithEditOnly,
    action: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'CreateForm automatically hides fields with editOnly=true (createdAt, updatedAt). Compare with EditForm story to see the difference.',
      },
    },
  },
}

export const WithValidation: Story = {
  args: {
    sections: basicSections,
    validation: validationSchema,
    action: fn(async (formData: FormData) => {
      const data: Record<string, FormDataEntryValue> = {}
      for (const [key, value] of formData.entries()) {
        data[key] = value
      }

      // Simulate validation error
      if (data.email === 'test@error.com') {
        return { success: false, message: 'Email já cadastrado!' }
      }

      return { success: true, message: 'Criado com sucesso!' }
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'CreateForm with Zod validation. Try submitting with invalid data or email="test@error.com" to see error handling.',
      },
    },
  },
}

export const WithComplexFields: Story = {
  args: {
    sections: [
      {
        label: 'Informações Pessoais',
        fields: [
          { name: 'name', label: 'Nome', type: 'text', required: true },
          { name: 'bio', label: 'Biografia', type: 'textarea' },
          { name: 'birthDate', label: 'Data de Nascimento', type: 'date' },
        ],
      },
      {
        label: 'Contato',
        fields: [
          { name: 'email', label: 'Email', type: 'email', required: true },
          {
            name: 'phone',
            label: 'Telefone',
            type: 'masked',
            maskType: 'tel',
            placeholder: '(11) 99999-9999',
          },
        ],
      },
      {
        label: 'Preferências',
        fields: [
          {
            name: 'categories',
            label: 'Categorias',
            type: 'multiselect',
            loadField: async () => [
              { value: 'tech', label: 'Tecnologia' },
              { value: 'design', label: 'Design' },
              { value: 'business', label: 'Negócios' },
            ],
          },
          {
            name: 'notifications',
            label: 'Receber notificações',
            type: 'boolean',
          },
        ],
      },
    ],
    defaultValues: {
      notifications: true,
    },
    action: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'CreateForm with multiple sections and complex field types (textarea, date, masked, multiselect, boolean).',
      },
    },
  },
}
