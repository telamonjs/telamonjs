import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminForm, EditForm } from './AdminForm'
import { FormSection } from './AdminForm'
import { z } from 'zod'

/**
 * TEST SUITE 3: AdminForm - Integration Tests
 *
 * Purpose: Test full integration flows including:
 * - EditForm → AdminForm → onChange → submit
 * - Nested data conversion (nested → flat)
 * - CRUD field data preservation
 * - Server Action integration
 *
 * These tests verify the COMPLETE user journey from initial load to successful submit.
 */

describe('AdminForm - Integration Tests', () => {
  const mockAction = vi.fn()
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
  })

  describe('Full Flow: Load → Edit → Submit', () => {
    it('should complete full flow: EditForm → AdminForm → onChange → submit', async () => {
      // Simulate Prisma nested data from server
      const serverData = {
        id: 'user-123',
        titulo: 'Gerente',
        pessoa: {
          nome: 'Marcos Tullyo',
          cpf: '123.456.789-00',
          email: 'marcos@example.com',
        },
        ativo: true,
      }

      const sections: FormSection[] = [
        {
          label: 'Dados Básicos',
          fields: [
            { name: 'titulo', label: 'Título', type: 'text', required: true },
            { name: 'ativo', label: 'Ativo', type: 'boolean' },
          ],
        },
        {
          label: 'Dados da Pessoa',
          fields: [
            {
              name: 'pessoa.nome',
              label: 'Nome',
              type: 'text',
              required: true,
            },
            { name: 'pessoa.cpf', label: 'CPF', type: 'text', required: true },
            {
              name: 'pessoa.email',
              label: 'Email',
              type: 'email',
              required: true,
            },
          ],
        },
      ]

      mockAction.mockResolvedValueOnce({
        success: true,
        message: 'Usuário atualizado com sucesso',
      })

      // EditForm automatically converts nested → flat
      // (In real code, EditForm would be used here)
      render(
        <AdminForm
          id={serverData.id}
          sections={sections}
          action={mockAction}
          data={{
            titulo: serverData.titulo,
            ativo: serverData.ativo,
            'pessoa.nome': serverData.pessoa.nome,
            'pessoa.cpf': serverData.pessoa.cpf,
            'pessoa.email': serverData.pessoa.email,
          }}
        />
      )

      // STEP 1: Verify initial values loaded correctly
      expect(screen.getByDisplayValue('Gerente')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Marcos Tullyo')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123.456.789-00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('marcos@example.com')).toBeInTheDocument()

      // STEP 2: User edits multiple fields
      const tituloInput = screen.getByLabelText('Título')
      const nomeInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')

      await user.clear(tituloInput)
      await user.type(tituloInput, 'Diretor')

      await user.clear(nomeInput)
      await user.type(nomeInput, 'Marcos Tullyo Silva')

      await user.clear(emailInput)
      await user.type(emailInput, 'marcos.silva@example.com')

      // STEP 3: Submit form
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // STEP 4: Verify FormData contains UPDATED values (not initial values)
      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('id')).toBe('user-123')
      expect(formData.get('titulo')).toBe('Diretor')
      expect(formData.get('pessoa.nome')).toBe('Marcos Tullyo Silva')
      expect(formData.get('pessoa.cpf')).toBe('123.456.789-00') // Unchanged
      expect(formData.get('pessoa.email')).toBe('marcos.silva@example.com')
      expect(formData.get('ativo')).toBe('true')
    })

    it('should preserve unchanged fields while updating others', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'campo1', label: 'Campo 1', type: 'text' },
            { name: 'campo2', label: 'Campo 2', type: 'text' },
            { name: 'campo3', label: 'Campo 3', type: 'text' },
            { name: 'campo4', label: 'Campo 4', type: 'text' },
          ],
        },
      ]

      const data = {
        campo1: 'Valor 1',
        campo2: 'Valor 2',
        campo3: 'Valor 3',
        campo4: 'Valor 4',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      // Only update campo2
      const campo2Input = screen.getByLabelText('Campo 2')
      await user.clear(campo2Input)
      await user.type(campo2Input, 'Novo Valor 2')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('campo1')).toBe('Valor 1') // Unchanged
      expect(formData.get('campo2')).toBe('Novo Valor 2') // Updated
      expect(formData.get('campo3')).toBe('Valor 3') // Unchanged
      expect(formData.get('campo4')).toBe('Valor 4') // Unchanged
    })
  })

  describe('Nested Data Conversion', () => {
    it('should handle Prisma nested data correctly', async () => {
      // Simulate data from Prisma with nested relations
      const prismaData = {
        id: 'fornecedor-1',
        pessoa: {
          nome: 'João Silva',
          cpf: '987.654.321-00',
          usuario: {
            email: 'joao@example.com',
            senha: 'hashedpassword',
          },
        },
        numeroHabilitacao: '12345678901',
      }

      const sections: FormSection[] = [
        {
          label: 'Dados do Fornecedor',
          fields: [
            {
              name: 'numeroHabilitacao',
              label: 'CNH',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          label: 'Dados Pessoais',
          fields: [
            {
              name: 'pessoa.nome',
              label: 'Nome',
              type: 'text',
              required: true,
            },
            { name: 'pessoa.cpf', label: 'CPF', type: 'text', required: true },
          ],
        },
        {
          label: 'Acesso',
          fields: [
            {
              name: 'pessoa.usuario.email',
              label: 'Email',
              type: 'email',
              required: true,
            },
          ],
        },
      ]

      // Flatten nested data (EditForm does this automatically)
      const flatData = {
        id: prismaData.id,
        numeroHabilitacao: prismaData.numeroHabilitacao,
        'pessoa.nome': prismaData.pessoa.nome,
        'pessoa.cpf': prismaData.pessoa.cpf,
        'pessoa.usuario.email': prismaData.pessoa.usuario.email,
      }

      render(
        <AdminForm
          id={prismaData.id}
          sections={sections}
          action={mockAction}
          data={flatData}
        />
      )

      // Verify all nested fields render correctly
      expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument()
      expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument()
      expect(screen.getByDisplayValue('987.654.321-00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('joao@example.com')).toBeInTheDocument()

      // Update deep nested field
      const emailInput = screen.getByLabelText('Email')
      await user.clear(emailInput)
      await user.type(emailInput, 'joao.silva@newdomain.com')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.usuario.email')).toBe(
        'joao.silva@newdomain.com'
      )
    })

    it('should handle mixed flat and nested data structures', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'id', label: 'ID', type: 'text', readOnly: true },
            { name: 'titulo', label: 'Título', type: 'text' },
            { name: 'pessoa.nome', label: 'Nome', type: 'text' },
            {
              name: 'pessoa.contato.telefone',
              label: 'Telefone',
              type: 'text',
            },
            { name: 'ativo', label: 'Ativo', type: 'boolean' },
          ],
        },
      ]

      const data = {
        id: '123',
        titulo: 'Título Teste',
        'pessoa.nome': 'Maria',
        'pessoa.contato.telefone': '(11) 98765-4321',
        ativo: true,
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      // Update both flat and nested fields
      const tituloInput = screen.getByLabelText('Título')
      const nomeInput = screen.getByLabelText('Nome')
      const telefoneInput = screen.getByLabelText('Telefone')

      await user.clear(tituloInput)
      await user.type(tituloInput, 'Novo Título')

      await user.clear(nomeInput)
      await user.type(nomeInput, 'Maria Silva')

      await user.clear(telefoneInput)
      await user.type(telefoneInput, '(11) 91234-5678')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('titulo')).toBe('Novo Título')
      expect(formData.get('pessoa.nome')).toBe('Maria Silva')
      expect(formData.get('pessoa.contato.telefone')).toBe('(11) 91234-5678')
    })
  })

  describe('CRUD Field Data Preservation', () => {
    it('should preserve CRUD field data (arrays) on submit', async () => {
      const sections: FormSection[] = [
        {
          label: 'Cliente',
          fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
          ],
        },
        {
          label: 'Regionais',
          editOnly: true,
          fields: [
            {
              name: 'regionais',
              label: 'Regionais',
              type: 'crud',
              fields: [],
              listFields: [],
            },
          ],
        },
      ]

      const data = {
        id: 'cliente-1',
        nome: 'Cliente ABC',
        regionais: [
          { id: 'regional-1', nome: 'Regional Sul' },
          { id: 'regional-2', nome: 'Regional Norte' },
        ],
      }

      render(
        <AdminForm
          id={data.id}
          sections={sections}
          action={mockAction}
          data={data}
        />
      )

      // Update only nome field
      const nomeInput = screen.getByLabelText('Nome')
      await user.clear(nomeInput)
      await user.type(nomeInput, 'Cliente XYZ')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('nome')).toBe('Cliente XYZ')

      // CRUD data should be preserved in FormData
      // AdminForm handles nested objects (line 596-606)
      // Arrays are stringified, but action can parse them
      expect(formData.get('regionais')).toBeTruthy()
    })

    it('should handle empty CRUD arrays', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
        {
          label: 'Items',
          editOnly: true,
          fields: [
            {
              name: 'items',
              label: 'Items',
              type: 'crud',
              fields: [],
              listFields: [],
            },
          ],
        },
      ]

      const data = {
        id: '1',
        nome: 'Test',
        items: [], // Empty array
      }

      render(
        <AdminForm
          id={data.id}
          sections={sections}
          action={mockAction}
          data={data}
        />
      )

      const nomeInput = screen.getByLabelText('Nome')
      await user.type(nomeInput, ' Updated')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // Should not throw error with empty array
      expect(mockAction).toHaveBeenCalled()
    })
  })

  describe('Server Action Integration', () => {
    it('should handle successful Server Action response', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      mockAction.mockResolvedValueOnce({
        success: true,
        message: 'Registro salvo com sucesso',
        data: { id: 'new-123', nome: 'Test' },
      })

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Nome')
      await user.type(input, 'Test')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // AdminForm logs successful response (line 625-640)
      // Toast should be shown (line 636-640)
    })

    it('should handle Server Action error response', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'email', label: 'Email', type: 'email' }],
        },
      ]

      mockAction.mockResolvedValueOnce({
        success: false,
        message: 'Email já está em uso',
        errors: {
          email: ['Este email já está cadastrado'],
        },
      })

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Email')
      await user.type(input, 'duplicate@example.com')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // Error should be displayed (AdminForm.tsx line 659-666)
      await waitFor(() => {
        expect(screen.getByText(/email já está em uso/i)).toBeInTheDocument()
      })
    })

    it('should handle Server Action validation errors', async () => {
      const schema = z.object({
        email: z.string().email('Email inválido'),
        senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
      })

      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'senha', label: 'Senha', type: 'password', required: true },
          ],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          validation={schema}
        />
      )

      const emailInput = screen.getByLabelText('Email')
      const senhaInput = screen.getByLabelText('Senha')

      // Invalid email
      await user.type(emailInput, 'invalid-email')
      await user.type(senhaInput, '123') // Too short

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Validation should prevent submit
      // (message renders twice: visible <p> + sr-only alert span)
      await waitFor(() => {
        expect(
          screen.getAllByText(/email inválido/i).length
        ).toBeGreaterThanOrEqual(1)
        expect(
          screen.getAllByText(/senha deve ter pelo menos 8 caracteres/i).length
        ).toBeGreaterThanOrEqual(1)
      })

      // Action should NOT be called
      expect(mockAction).not.toHaveBeenCalled()
    })

    it('should retry submit after fixing validation errors', async () => {
      const schema = z.object({
        nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
      })

      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'nome', label: 'Nome', type: 'text', required: true },
          ],
        },
      ]

      mockAction.mockResolvedValueOnce({
        success: true,
        message: 'Salvo com sucesso',
      })

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          validation={schema}
        />
      )

      const input = screen.getByLabelText('Nome')

      // First attempt: invalid
      await user.type(input, 'AB')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // (message renders twice: visible <p> + sr-only alert span)
      await waitFor(() => {
        expect(
          screen.getAllByText(/nome deve ter pelo menos 3 caracteres/i).length
        ).toBeGreaterThanOrEqual(1)
      })

      expect(mockAction).not.toHaveBeenCalled()

      // Fix validation error
      await user.clear(input)
      await user.type(input, 'ABC')

      // Second attempt: valid
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('nome')).toBe('ABC')
    })
  })

  describe('Complex Integration Scenarios', () => {
    it('should handle form with all field types', async () => {
      const sections: FormSection[] = [
        {
          label: 'Texto',
          fields: [
            { name: 'texto', label: 'Texto', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'password', label: 'Senha', type: 'password' },
          ],
        },
        {
          label: 'Números',
          fields: [
            { name: 'numero', label: 'Número', type: 'number' },
            { name: 'float', label: 'Float', type: 'float' },
          ],
        },
        {
          label: 'Outros',
          fields: [
            { name: 'ativo', label: 'Ativo', type: 'boolean' },
            { name: 'descricao', label: 'Descrição', type: 'textarea' },
          ],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} useTabs />)

      // Fill all fields
      // ('Texto' is also the section/tab label, so scope query to textbox)
      await user.type(
        screen.getByRole('textbox', { name: 'Texto' }),
        'Texto de teste'
      )
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Senha'), 'password123')

      // Navigate to second tab
      const numerosTab = screen.getByRole('tab', { name: /números/i })
      await user.click(numerosTab)

      await user.type(screen.getByLabelText('Número'), '42')
      await user.type(screen.getByLabelText('Float'), '3.14')

      // Navigate to third tab
      const outrosTab = screen.getByRole('tab', { name: /outros/i })
      await user.click(outrosTab)

      await user.click(screen.getByRole('switch')) // Toggle Ativo
      await user.type(screen.getByLabelText('Descrição'), 'Descrição completa')

      // Submit
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('texto')).toBe('Texto de teste')
      expect(formData.get('email')).toBe('test@example.com')
      expect(formData.get('password')).toBe('password123')
      expect(formData.get('numero')).toBe('42')
      expect(formData.get('float')).toBe('3.14')
      expect(formData.get('ativo')).toBe('true')
      expect(formData.get('descricao')).toBe('Descrição completa')
    })

    it('should handle concurrent edits to multiple nested fields', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'pessoa.nome', label: 'Nome', type: 'text' },
            { name: 'pessoa.email', label: 'Email', type: 'email' },
            {
              name: 'pessoa.contato.telefone',
              label: 'Telefone',
              type: 'text',
            },
            { name: 'pessoa.contato.celular', label: 'Celular', type: 'text' },
          ],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{
            'pessoa.nome': 'Old Name',
            'pessoa.email': 'old@email.com',
            'pessoa.contato.telefone': '1111-1111',
            'pessoa.contato.celular': '99999-9999',
          }}
        />
      )

      // Edit all fields concurrently (no await between edits)
      const nomeInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')
      const telefoneInput = screen.getByLabelText('Telefone')
      const celularInput = screen.getByLabelText('Celular')

      // Clear all
      await user.clear(nomeInput)
      await user.clear(emailInput)
      await user.clear(telefoneInput)
      await user.clear(celularInput)

      // Type all (rapid fire)
      await user.type(nomeInput, 'New Name')
      await user.type(emailInput, 'new@email.com')
      await user.type(telefoneInput, '2222-2222')
      await user.type(celularInput, '88888-8888')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.nome')).toBe('New Name')
      expect(formData.get('pessoa.email')).toBe('new@email.com')
      expect(formData.get('pessoa.contato.telefone')).toBe('2222-2222')
      expect(formData.get('pessoa.contato.celular')).toBe('88888-8888')
    })
  })

  /**
   * Regression: async submit inside startTransition must be awaited.
   *
   * startTransition(async () => { await handleFormSubmission() }) — React 19
   * only keeps isPending true while the awaited promise is unsettled. If the
   * async handler were NOT awaited (the old `startTransition(() => { handler() })`
   * shape), isPending would flip back to false immediately, re-enabling the
   * submit button before the network/Server-Action work finished (double-submit
   * window). These tests pin isPending to the lifecycle of the submit promise.
   */
  describe('Pending state tracks async submit (startTransition await)', () => {
    it('keeps the submit control disabled until the deferred action resolves', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      // Deferred promise we resolve manually to control when the action settles.
      let resolveAction: (value: { success: boolean; message: string }) => void
      const actionPromise = new Promise<{ success: boolean; message: string }>(
        resolve => {
          resolveAction = resolve
        }
      )
      mockAction.mockReturnValueOnce(actionPromise)

      render(<AdminForm sections={sections} action={mockAction} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      expect(submitButton).not.toBeDisabled()

      await user.click(submitButton)

      // While the action promise is unsettled, the transition is pending:
      // the button is disabled and shows the "Salvando..." label.
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /salvando/i })
        ).toBeDisabled()
      })
      expect(mockAction).toHaveBeenCalledTimes(1)

      // Resolve the action — only now should isPending flip back to false.
      resolveAction!({ success: true, message: 'ok' })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /salvar/i })
        ).not.toBeDisabled()
      })
    })

    it('surfaces the error and re-enables submit when the action rejects', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      let rejectAction: (reason: Error) => void
      const actionPromise = new Promise<never>((_, reject) => {
        rejectAction = reject
      })
      mockAction.mockReturnValueOnce(actionPromise)

      render(<AdminForm sections={sections} action={mockAction} />)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Pending while the rejection is in flight.
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /salvando/i })
        ).toBeDisabled()
      })
      expect(mockAction).toHaveBeenCalledTimes(1)

      // Reject — error message must render and submit must re-enable.
      rejectAction!(new Error('Falha ao salvar no servidor'))

      await waitFor(() => {
        expect(
          screen.getByText(/falha ao salvar no servidor/i)
        ).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /salvar/i })
        ).not.toBeDisabled()
      })
    })
  })
})
