import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminForm } from './AdminForm'
import { FormSection } from './AdminForm'
import { z } from 'zod'

/**
 * TEST SUITE 1: AdminForm - Nested Data Fields
 *
 * Purpose: Verify that nested fields (pessoa.nome, pessoa.cpf) update correctly
 * when user types, and that values persist through form lifecycle.
 *
 * Bug context: Fields with dot notation were not updating form state due to:
 * 1. defaultValue in Controller causing conflicts
 * 2. useEffect with form.reset() executing at wrong times
 * 3. Fast Refresh re-creating form object, losing user changes
 */

describe('AdminForm - Nested Data Fields', () => {
  const mockAction = vi.fn()
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
  })

  describe('Rendering', () => {
    it('should render nested fields with initial values', () => {
      const sections: FormSection[] = [
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
          ],
        },
      ]

      const data = {
        'pessoa.nome': 'Marcos Tullyo',
        'pessoa.cpf': '123.456.789-00',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      // Verify fields render with initial values
      expect(screen.getByDisplayValue('Marcos Tullyo')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123.456.789-00')).toBeInTheDocument()
    })

    it('should render nested fields with empty values', () => {
      const sections: FormSection[] = [
        {
          label: 'Dados da Pessoa',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Nome')
      expect(input).toHaveValue('')
    })
  })

  describe('Interactions', () => {
    it('should update form state when typing in nested field (pessoa.nome)', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados da Pessoa',
          fields: [
            {
              name: 'pessoa.nome',
              label: 'Nome',
              type: 'text',
              required: true,
            },
          ],
        },
      ]

      const data = {
        'pessoa.nome': 'Marcos Tullyo',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      const input = screen.getByLabelText('Nome')
      expect(input).toHaveValue('Marcos Tullyo')

      // User types " 3" to append to existing value
      await user.clear(input)
      await user.type(input, 'Marcos Tullyo 3')

      // Verify input shows new value
      expect(input).toHaveValue('Marcos Tullyo 3')

      // Submit form to verify form state was updated
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // Verify FormData contains updated value
      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.nome')).toBe('Marcos Tullyo 3')
    })

    it('should update multiple nested fields independently', async () => {
      const sections: FormSection[] = [
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
          ],
        },
      ]

      const data = {
        'pessoa.nome': 'João',
        'pessoa.cpf': '000.000.000-00',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      const nomeInput = screen.getByLabelText('Nome')
      const cpfInput = screen.getByLabelText('CPF')

      // Update both fields
      await user.clear(nomeInput)
      await user.type(nomeInput, 'Maria')

      await user.clear(cpfInput)
      await user.type(cpfInput, '111.111.111-11')

      // Submit
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // Verify both values updated
      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.nome')).toBe('Maria')
      expect(formData.get('pessoa.cpf')).toBe('111.111.111-11')
    })

    it('should handle rapid typing correctly (debouncing)', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Nome')

      // Rapid typing
      await user.type(input, 'Marcos Tullyo Silva Santos')

      // Verify final value
      expect(input).toHaveValue('Marcos Tullyo Silva Santos')

      // Submit to verify form state
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.nome')).toBe('Marcos Tullyo Silva Santos')
    })
  })

  describe('Submit Behavior', () => {
    it('should submit correct values with nested fields', async () => {
      const sections: FormSection[] = [
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

      const data = {
        'pessoa.nome': 'Old Name',
        'pessoa.cpf': '000.000.000-00',
        'pessoa.email': 'old@email.com',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      // Update all fields
      const nomeInput = screen.getByLabelText('Nome')
      const cpfInput = screen.getByLabelText('CPF')
      const emailInput = screen.getByLabelText('Email')

      await user.clear(nomeInput)
      await user.type(nomeInput, 'New Name')

      await user.clear(cpfInput)
      await user.type(cpfInput, '123.456.789-00')

      await user.clear(emailInput)
      await user.type(emailInput, 'new@email.com')

      // Submit
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // Verify action received new values, NOT old values
      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.nome')).toBe('New Name')
      expect(formData.get('pessoa.cpf')).toBe('123.456.789-00')
      expect(formData.get('pessoa.email')).toBe('new@email.com')
    })

    it('should submit with mixed nested and flat fields', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'titulo', label: 'Título', type: 'text', required: true }, // Flat
            {
              name: 'pessoa.nome',
              label: 'Nome',
              type: 'text',
              required: true,
            }, // Nested
            { name: 'ativo', label: 'Ativo', type: 'boolean' }, // Flat
          ],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ titulo: 'Título Inicial' }}
        />
      )

      // Fill all fields
      const tituloInput = screen.getByLabelText('Título')
      const nomeInput = screen.getByLabelText('Nome')

      await user.clear(tituloInput)
      await user.type(tituloInput, 'Novo Título')
      await user.type(nomeInput, 'Marcos')

      // Submit
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('titulo')).toBe('Novo Título')
      expect(formData.get('pessoa.nome')).toBe('Marcos')
    })
  })

  describe('Re-render Behavior', () => {
    it('should preserve user changes after normal re-renders (NOT re-mount)', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      const { rerender } = render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ 'pessoa.nome': 'Initial' }}
        />
      )

      const input = screen.getByLabelText('Nome')

      // User types
      await user.clear(input)
      await user.type(input, 'User Typed Value')

      expect(input).toHaveValue('User Typed Value')

      // Re-render with SAME data (simulates parent re-render, NOT Fast Refresh)
      rerender(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ 'pessoa.nome': 'Initial' }}
        />
      )

      // User changes should persist (form.reset() not called on normal re-renders)
      await waitFor(() => {
        expect(input).toHaveValue('User Typed Value')
      })
    })

    it('should reset to server data on mount with NEW data', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      const { unmount } = render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ 'pessoa.nome': 'First Data' }}
        />
      )

      expect(screen.getByLabelText('Nome')).toHaveValue('First Data')

      // Simulate navigation to a different record (new mount cycle).
      // form.reset(data) only runs on mount / form re-creation, so a fresh
      // mount is required to pick up new server data.
      unmount()
      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ 'pessoa.nome': 'Second Data' }}
        />
      )

      // Should show new data from server
      await waitFor(() => {
        expect(screen.getByLabelText('Nome')).toHaveValue('Second Data')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null nested values gracefully', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ 'pessoa.nome': null as any }}
        />
      )

      const input = screen.getByLabelText('Nome')
      expect(input).toHaveValue('')

      // Should be able to type
      await user.type(input, 'New Value')
      expect(input).toHaveValue('New Value')
    })

    it('should handle undefined nested values gracefully', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          // data does not contain pessoa.nome
        />
      )

      const input = screen.getByLabelText('Nome')
      expect(input).toHaveValue('')

      await user.type(input, 'New Value')
      expect(input).toHaveValue('New Value')
    })

    it('should handle deeply nested paths (3+ levels)', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            {
              name: 'fornecedores.pessoa.usuario.email',
              label: 'Email',
              type: 'email',
            },
          ],
        },
      ]

      const data = {
        'fornecedores.pessoa.usuario.email': 'test@example.com',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      const input = screen.getByLabelText('Email')
      expect(input).toHaveValue('test@example.com')

      await user.clear(input)
      await user.type(input, 'new@example.com')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('fornecedores.pessoa.usuario.email')).toBe(
        'new@example.com'
      )
    })

    it('should handle empty string values correctly', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      const data = {
        'pessoa.nome': 'Initial Value',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      const input = screen.getByLabelText('Nome')

      // Clear field (user deletes all text)
      await user.clear(input)

      expect(input).toHaveValue('')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      // Empty string should not be in FormData (filtered out in AdminForm.tsx line 600-601)
      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.nome')).toBeNull()
    })

    it('should handle special characters in nested values', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Nome')

      // Type special characters
      await user.type(input, "João d'Ávila & Souza (Jr.)")

      expect(input).toHaveValue("João d'Ávila & Souza (Jr.)")

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('pessoa.nome')).toBe("João d'Ávila & Souza (Jr.)")
    })
  })

  describe('Validation with Nested Fields', () => {
    it('should validate nested fields with Zod schema', async () => {
      // RHF resolves dot-notation field names to a nested values structure,
      // so the Zod schema must mirror that nesting
      const schema = z.object({
        pessoa: z.object({
          nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
          cpf: z.string().length(14, 'CPF inválido'),
        }),
      })

      const sections: FormSection[] = [
        {
          label: 'Dados',
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
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          validation={schema}
        />
      )

      const nomeInput = screen.getByLabelText('Nome')

      // Type invalid value (too short)
      await user.type(nomeInput, 'AB')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      // Should show validation error
      // (message renders twice: visible <p> + sr-only alert span)
      await waitFor(() => {
        expect(
          screen.getAllByText(/nome deve ter pelo menos 3 caracteres/i).length
        ).toBeGreaterThanOrEqual(1)
      })

      // Action should NOT be called
      expect(mockAction).not.toHaveBeenCalled()
    })
  })
})
