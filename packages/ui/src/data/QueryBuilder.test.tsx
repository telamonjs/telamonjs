import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/test-utils'
import userEvent from '@testing-library/user-event'
import { QueryBuilder, QueryBuilderField } from './QueryBuilder'

describe('QueryBuilder', () => {
  const mockFields: QueryBuilderField[] = [
    { name: 'name', label: 'Name', type: 'string' },
    { name: 'age', label: 'Age', type: 'number' },
    { name: 'active', label: 'Active', type: 'boolean' },
    { name: 'createdAt', label: 'Created At', type: 'date' },
    {
      name: 'status',
      label: 'Status',
      type: 'enum',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ]

  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('Rendering', () => {
    it('renders with empty conditions', () => {
      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{ logic: 'AND', conditions: [] }}
        />
      )

      expect(screen.getByText('Adicionar condição')).toBeInTheDocument()
    })

    it('renders with initial string condition', () => {
      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'equals',
                value: 'John',
                fieldType: 'string',
              },
            ],
          }}
        />
      )

      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByText('1 condição ativa')).toBeInTheDocument()
    })

    it('shows logic selector with multiple conditions', () => {
      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'equals',
                value: 'John',
                fieldType: 'string',
              },
              {
                id: '2',
                field: 'age',
                operator: 'gt',
                value: 18,
                fieldType: 'number',
              },
            ],
          }}
        />
      )

      expect(screen.getByText('Combinar condições com:')).toBeInTheDocument()
    })

    it('shows AND/OR labels between conditions', () => {
      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'OR',
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'equals',
                value: 'John',
                fieldType: 'string',
              },
              {
                id: '2',
                field: 'name',
                operator: 'equals',
                value: 'Jane',
                fieldType: 'string',
              },
            ],
          }}
        />
      )

      expect(screen.getByText('OU')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('adds new condition when clicking add button', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{ logic: 'AND', conditions: [] }}
        />
      )

      const addButton = screen.getByText('Adicionar condição')
      await user.click(addButton)

      expect(mockOnChange).toHaveBeenCalled()
      const callArg = mockOnChange.mock.calls[0][0]
      expect(callArg.conditions.length).toBe(1)
      expect(callArg.conditions[0].field).toBe('name')
      expect(callArg.conditions[0].operator).toBe('equals')
    })

    it('removes condition when clicking remove button', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'equals',
                value: 'John',
                fieldType: 'string',
              },
            ],
          }}
        />
      )

      const removeButton = screen.getByTitle('Remover condição')
      await user.click(removeButton)

      expect(mockOnChange).toHaveBeenCalled()
      const callArg = mockOnChange.mock.calls[0][0]
      expect(callArg.conditions.length).toBe(0)
    })

    it('updates string value', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'equals',
                value: 'John',
                fieldType: 'string',
              },
            ],
          }}
        />
      )

      const input = screen.getByDisplayValue('John')
      await user.clear(input)
      await user.type(input, 'Jane')

      expect(mockOnChange).toHaveBeenCalled()
    })

    it('updates number value', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'age',
                operator: 'equals',
                value: 25,
                fieldType: 'number',
              },
            ],
          }}
        />
      )

      const input = screen.getByDisplayValue('25')
      await user.clear(input)
      await user.type(input, '30')

      expect(mockOnChange).toHaveBeenCalled()
    })

    it('updates date value', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'createdAt',
                operator: 'equals',
                value: new Date('2023-01-01'),
                fieldType: 'date',
              },
            ],
          }}
        />
      )

      const input = screen.getByDisplayValue('2023-01-01')
      await user.clear(input)
      await user.type(input, '2023-12-31')

      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('Field Types', () => {
    it('renders number input for number fields', () => {
      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'age',
                operator: 'equals',
                value: 25,
                fieldType: 'number',
              },
            ],
          }}
        />
      )

      const input = screen.getByDisplayValue('25')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('shows a number value of 0 instead of an empty input', () => {
      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [{ id: '1', field: 'age', operator: 'equals', value: 0, fieldType: 'number' }],
          }}
        />
      )
      expect(screen.getByDisplayValue('0')).toHaveAttribute('type', 'number')
    })

    it('renders date input for date fields', () => {
      render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'createdAt',
                operator: 'equals',
                value: new Date('2023-01-01'),
                fieldType: 'date',
              },
            ],
          }}
        />
      )

      const input = screen.getByDisplayValue('2023-01-01')
      expect(input).toHaveAttribute('type', 'date')
    })

    it('hides value input for isNull operator', () => {
      const { container } = render(
        <QueryBuilder
          fields={mockFields}
          onChange={mockOnChange}
          value={{
            logic: 'AND',
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'isNull',
                value: '',
                fieldType: 'string',
              },
            ],
          }}
        />
      )

      const inputs = container.querySelectorAll('input[placeholder="Valor"]')
      expect(inputs.length).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty fields array', () => {
      render(
        <QueryBuilder
          fields={[]}
          onChange={mockOnChange}
          value={{ logic: 'AND', conditions: [] }}
        />
      )

      expect(screen.getByText('Adicionar condição')).toBeInTheDocument()
    })

    it('handles undefined value prop', () => {
      render(<QueryBuilder fields={mockFields} onChange={mockOnChange} />)

      expect(screen.getByText('Adicionar condição')).toBeInTheDocument()
    })
  })
})
