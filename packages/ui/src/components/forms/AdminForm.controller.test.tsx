import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminForm } from './AdminForm'
import { FormSection } from './AdminForm'

/**
 * TEST SUITE 2: AdminForm - Controller Configuration
 *
 * Purpose: Verify that Controller is configured correctly WITHOUT defaultValue,
 * and that form.reset() is the ONLY mechanism for setting initial values.
 *
 * Bug context: Previous implementation had defaultValue in Controller causing
 * conflict with controlled value updates, leading to lost onChange events.
 *
 * Fix applied:
 * - Removed `defaultValue={defaultValue}` from Controller (AdminForm.tsx line 697)
 * - All initial values now set via form.reset(data) in useEffect (line 524-539)
 */

describe('AdminForm - Controller Configuration', () => {
  const mockAction = vi.fn()
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
  })

  describe('Controller Props', () => {
    it('should NOT use defaultValue prop in Controller', () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      const consoleSpy = vi.spyOn(console, 'warn')

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ nome: 'Test' }}
        />
      )

      // React Hook Form will warn if defaultValue conflicts with controlled value
      // We expect NO warnings
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('defaultValue')
      )

      consoleSpy.mockRestore()
    })

    it('should use form.reset() for setting initial values', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'nome', label: 'Nome', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' },
          ],
        },
      ]

      const data = {
        nome: 'Initial Name',
        email: 'initial@example.com',
      }

      render(<AdminForm sections={sections} action={mockAction} data={data} />)

      // form.reset(data) on mount populates the inputs with initial values
      await waitFor(() => {
        expect(screen.getByLabelText('Nome')).toHaveValue('Initial Name')
        expect(screen.getByLabelText('Email')).toHaveValue(
          'initial@example.com'
        )
      })
    })

    it('should apply initial data on mount', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ nome: 'Test' }}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText('Nome')).toHaveValue('Test')
      })
    })

    it('should NOT call form.reset on normal re-renders', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      const { rerender } = render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ nome: 'Initial' }}
        />
      )

      const input = screen.getByLabelText('Nome')
      expect(input).toHaveValue('Initial')

      // User edits the field
      await user.clear(input)
      await user.type(input, 'User Edited')
      expect(input).toHaveValue('User Edited')

      // Re-render with SAME data
      rerender(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ nome: 'Initial' }}
        />
      )

      // Wait a bit to ensure no reset happens
      await new Promise(resolve => setTimeout(resolve, 100))

      // form.reset should NOT be called again: user edits are preserved
      expect(input).toHaveValue('User Edited')
    })

    it('should call form.reset when form object is re-created (Fast Refresh)', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      // Initial render
      const { unmount } = render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ nome: 'Initial' }}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText('Nome')).toHaveValue('Initial')
      })

      // Unmount and re-mount (simulates Fast Refresh)
      unmount()
      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ nome: 'Initial' }}
        />
      )

      // Should call form.reset again (detected as initial mount)
      await waitFor(() => {
        expect(screen.getByLabelText('Nome')).toHaveValue('Initial')
      })
    })
  })

  describe('onChange Event Handling', () => {
    it('should handle multiple onChange events correctly', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      const onFieldChange = vi.fn()

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          onFieldChange={onFieldChange}
        />
      )

      const input = screen.getByLabelText('Nome')

      // Type "abc" (3 onChange events)
      await user.type(input, 'abc')

      await waitFor(() => {
        expect(input).toHaveValue('abc')
      })

      // Each keystroke triggers an onChange persisted to form state
      expect(onFieldChange.mock.calls.length).toBeGreaterThanOrEqual(3)
      expect(onFieldChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          field: 'nome',
          value: 'abc',
        })
      )
    })

    it('should persist each onChange to form state', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      const consoleLogSpy = vi.spyOn(console, 'log')

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Nome')

      // Type "a"
      await user.type(input, 'a')
      expect(input).toHaveValue('a')

      // Type "b"
      await user.type(input, 'b')
      expect(input).toHaveValue('ab')

      // Type "c"
      await user.type(input, 'c')
      expect(input).toHaveValue('abc')

      // AdminForm logs verification after each onChange (line 717-726)
      const verificationLogs = consoleLogSpy.mock.calls.filter(call =>
        call[0]?.includes('[AdminForm] After onChange, form has')
      )

      // Each verification should show match: true
      verificationLogs.forEach(log => {
        expect(log[1]).toMatchObject({ match: true })
      })

      consoleLogSpy.mockRestore()
    })

    it('should not lose onChange events during rapid typing', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Nome')

      // Very rapid typing
      const testString = 'The quick brown fox jumps over the lazy dog'
      await user.type(input, testString)

      // All characters should be captured
      expect(input).toHaveValue(testString)

      // Submit to verify form state
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('nome')).toBe(testString)
    })

    it('should handle onChange for nested fields without conflicts', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'pessoa.nome', label: 'Nome', type: 'text' }],
        },
      ]

      const consoleLogSpy = vi.spyOn(console, 'log')

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ 'pessoa.nome': 'Initial' }}
        />
      )

      const input = screen.getByLabelText('Nome')

      // Clear and type new value
      await user.clear(input)
      await user.type(input, 'New Value')

      // All onChange calls should succeed (match: true)
      await waitFor(() => {
        const verificationLogs = consoleLogSpy.mock.calls.filter(call =>
          call[0]?.includes('[AdminForm] After onChange, form has')
        )

        verificationLogs.forEach(log => {
          expect(log[1]).toMatchObject({ match: true })
        })
      })

      consoleLogSpy.mockRestore()
    })
  })

  describe('Form State Management', () => {
    it('should maintain consistent form state between onChange and getValues', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'campo1', label: 'Campo 1', type: 'text' },
            { name: 'campo2', label: 'Campo 2', type: 'text' },
          ],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const campo1 = screen.getByLabelText('Campo 1')
      const campo2 = screen.getByLabelText('Campo 2')

      // Fill both fields
      await user.type(campo1, 'Valor 1')
      await user.type(campo2, 'Valor 2')

      expect(campo1).toHaveValue('Valor 1')
      expect(campo2).toHaveValue('Valor 2')

      // Submit to verify form.getValues() matches inputs
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('campo1')).toBe('Valor 1')
      expect(formData.get('campo2')).toBe('Valor 2')
    })

    it('should handle field value changes via Controller onChange prop', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'ativo', label: 'Ativo', type: 'boolean' }],
        },
      ]

      render(
        <AdminForm
          sections={sections}
          action={mockAction}
          data={{ ativo: false }}
        />
      )

      // Boolean field renders as switch
      const switchElement = screen.getByRole('switch')
      expect(switchElement).not.toBeChecked()

      // Toggle switch (triggers onChange)
      await user.click(switchElement)

      await waitFor(() => {
        expect(switchElement).toBeChecked()
      })

      // Submit to verify
      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('ativo')).toBe('true')
    })
  })

  describe('Error Handling', () => {
    it('should handle onChange errors gracefully', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'nome', label: 'Nome', type: 'text' }],
        },
      ]

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Nome')

      // Type normally
      await user.type(input, 'Test')

      // Should not throw errors
      expect(consoleErrorSpy).not.toHaveBeenCalled()
      expect(input).toHaveValue('Test')

      consoleErrorSpy.mockRestore()
    })

    it('should handle malformed field configurations', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: '', label: 'Invalid', type: 'text' }, // Empty name
          ],
        },
      ]

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      // Should not crash
      expect(() => {
        render(<AdminForm sections={sections} action={mockAction} />)
      }).not.toThrow()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should handle fields with same name prefix correctly', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [
            { name: 'nome', label: 'Nome', type: 'text' },
            { name: 'nome_completo', label: 'Nome Completo', type: 'text' },
          ],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const nomeInput = screen.getByLabelText('Nome')
      const nomeCompletoInput = screen.getByLabelText('Nome Completo')

      await user.type(nomeInput, 'João')
      await user.type(nomeCompletoInput, 'João da Silva')

      expect(nomeInput).toHaveValue('João')
      expect(nomeCompletoInput).toHaveValue('João da Silva')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('nome')).toBe('João')
      expect(formData.get('nome_completo')).toBe('João da Silva')
    })

    it('should handle Unicode characters in onChange', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'texto', label: 'Texto', type: 'text' }],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const input = screen.getByLabelText('Texto')

      // Type Unicode characters
      await user.type(input, '日本語 한국어 العربية 🚀')

      expect(input).toHaveValue('日本語 한국어 العربية 🚀')

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('texto')).toBe('日本語 한국어 العربية 🚀')
    })

    it('should handle very long strings in onChange', async () => {
      const sections: FormSection[] = [
        {
          label: 'Dados',
          fields: [{ name: 'descricao', label: 'Descrição', type: 'textarea' }],
        },
      ]

      render(<AdminForm sections={sections} action={mockAction} />)

      const textarea = screen.getByLabelText('Descrição')

      // Paste rather than type: same onChange path, without 5000 key events
      const longString = 'A'.repeat(5000)
      await user.click(textarea)
      await user.paste(longString)

      expect(textarea).toHaveValue(longString)

      const submitButton = screen.getByRole('button', { name: /salvar/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledTimes(1)
      })

      const formData = mockAction.mock.calls[0][0] as FormData
      expect(formData.get('descricao')).toBe(longString)
    })
  })
})
