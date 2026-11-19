import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { EditForm } from './EditForm'
import type { FormSection } from '../../types/forms/admin-form'
import { z } from 'zod'

const validationSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
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
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
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
    description: 'Campos somente para edição (não aparecem no CreateForm)',
    fields: [
      {
        name: 'createdAt',
        label: 'Criado em',
        type: 'date',
        editOnly: true,
        readOnly: true,
      },
      {
        name: 'updatedAt',
        label: 'Última Atualização',
        type: 'date',
        editOnly: true,
        readOnly: true,
      },
    ],
  },
]

const meta = {
  title: 'Forms/EditForm',
  component: EditForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# EditForm

Semantic wrapper para formulários de **edição**. Requer \`id\` e \`data\` obrigatórios, mostra todos os campos incluindo \`editOnly\`.

## Features

- ✅ **Requires id + data** - TypeScript enforced props
- ✅ **Shows editOnly fields** - Campos como "Criado em" aparecem (disabled)
- ✅ **Semantic naming** - \`data\` ao invés de \`defaultValues\`
- ✅ **Submit button text** - Default: "Salvar"
- ✅ **Auto-converts nested → flat** - Prisma compatibility for nested objects

## Quick Start

\`\`\`typescript
import { EditForm } from '@telamonjs/ui'

<EditForm
  id={entity.id}              // Required
  data={entity}               // Required
  sections={formSections}
  action={updateUser}
  validation={validationSchema}
/>
\`\`\`

## When to Use

- ✅ **Always use on /[id]/editar pages** (edit routes)
- ✅ When you need to show readonly/disabled system fields (createdAt, etc)
- ✅ When editing existing records with complex nested data
- ❌ Don't use for create pages (use CreateForm instead)
- ❌ Don't use for generic forms (use Form/AdminForm)

## editOnly Fields

EditForm **shows** fields with \`editOnly: true\` (usually disabled):

\`\`\`typescript
const sections = [
  {
    fields: [
      { name: 'name', type: 'text' },      // ✅ Editable
      { name: 'createdAt', type: 'date', editOnly: true, disabled: true }  // ✅ Shows (read-only)
    ]
  }
]
\`\`\`

## Nested Data Conversion

EditForm automatically converts nested Prisma data to flat FormData:

\`\`\`typescript
// Input data (nested from Prisma)
const entity = {
  id: '123',
  person: { name: 'John', cpf: '123' },
  email: 'john@example.com'
}

// EditForm converts to flat for RHF
// RHF receives: { 'person.name': 'John', 'person.cpf': '123', email: '...' }
\`\`\`

This ensures compatibility with FormData and Server Actions.
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EditForm>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    id: '123',
    data: {
      name: 'João Silva',
      email: 'joao@example.com',
    },
    sections: basicSections,
    validation: validationSchema,
    action: fn(async (formData: FormData) => {
      const data: Record<string, FormDataEntryValue> = {}
      for (const [key, value] of formData.entries()) {
        data[key] = value
      }
      console.log('EditForm submitted:', data)
      return { success: true, message: 'Usuário atualizado com sucesso!' }
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic EditForm with pre-filled name and email fields.',
      },
    },
  },
}

export const WithEditOnlyFields: Story = {
  args: {
    id: '123',
    data: {
      name: 'João Silva',
      email: 'joao@example.com',
      createdAt: '2024-01-15',
      updatedAt: '2024-02-03',
    },
    sections: sectionsWithEditOnly,
    action: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'EditForm showing editOnly fields (createdAt, updatedAt) as disabled/readonly. Compare with CreateForm to see these fields are hidden there.',
      },
    },
  },
}

export const WithNestedData: Story = {
  args: {
    id: '456',
    data: {
      pessoa: {
        nome: 'Maria Santos',
        cpf: '123.456.789-00',
      },
      email: 'maria@example.com',
      telefone: '(11) 99999-9999',
    },
    sections: [
      {
        label: 'Dados Pessoais',
        fields: [
          {
            name: 'pessoa.nome',
            label: 'Nome Completo',
            type: 'text',
            required: true,
          },
          {
            name: 'pessoa.cpf',
            label: 'CPF',
            type: 'masked',
            maskType: 'cpf',
            required: true,
          },
        ],
      },
      {
        label: 'Contato',
        fields: [
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            required: true,
          },
          {
            name: 'telefone',
            label: 'Telefone',
            type: 'masked',
            maskType: 'tel',
          },
        ],
      },
    ],
    action: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'EditForm with nested data (pessoa.nome, pessoa.cpf). The form automatically converts nested objects to flat dot notation for FormData compatibility.',
      },
    },
  },
}

export const WithComplexData: Story = {
  args: {
    id: '789',
    data: {
      name: 'Carlos Oliveira',
      email: 'carlos@example.com',
      bio: 'Desenvolvedor apaixonado por tecnologia.',
      birthDate: '1990-05-15',
      phone: '(21) 98888-7777',
      categories: ['tech', 'design'],
      notifications: true,
      active: true,
      createdAt: '2023-12-01',
      updatedAt: '2024-02-03',
    },
    sections: [
      {
        label: 'Informações Pessoais',
        fields: [
          { name: 'name', label: 'Nome', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'bio', label: 'Biografia', type: 'textarea' },
          { name: 'birthDate', label: 'Data de Nascimento', type: 'date' },
        ],
      },
      {
        label: 'Contato',
        fields: [
          {
            name: 'phone',
            label: 'Telefone',
            type: 'masked',
            maskType: 'tel',
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
          {
            name: 'active',
            label: 'Usuário Ativo',
            type: 'boolean',
          },
        ],
      },
      {
        label: 'Sistema',
        fields: [
          {
            name: 'createdAt',
            label: 'Criado em',
            type: 'date',
            editOnly: true,
            readOnly: true,
          },
          {
            name: 'updatedAt',
            label: 'Última Atualização',
            type: 'date',
            editOnly: true,
            readOnly: true,
          },
        ],
      },
    ],
    action: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'EditForm with complex data including multiple field types, multiselect, boolean switches, and readonly editOnly fields.',
      },
    },
  },
}

export const WithValidation: Story = {
  args: {
    id: '999',
    data: {
      name: 'Pedro Costa',
      email: 'pedro@example.com',
    },
    sections: basicSections,
    validation: validationSchema,
    action: fn(async (formData: FormData) => {
      const data: Record<string, FormDataEntryValue> = {}
      for (const [key, value] of formData.entries()) {
        data[key] = value
      }

      // Simulate validation error
      if (data.email === 'test@error.com') {
        return { success: false, message: 'Email já cadastrado por outro usuário!' }
      }

      return { success: true, message: 'Atualizado com sucesso!' }
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'EditForm with Zod validation. Try changing email to "test@error.com" to see server-side error handling.',
      },
    },
  },
}
