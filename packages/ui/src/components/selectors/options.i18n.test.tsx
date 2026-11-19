import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, type FieldValues, type ControllerRenderProps } from 'react-hook-form'
import { Combobox, type IOption } from './combobox'
import { MultiSelect } from './MultiSelect'
import { StatusFilter } from '../filters/StatusFilter'
import { msg } from '../../i18n/msg'
import { withAppMessages } from '../../test/intl'

const app = { opts: { active: 'Active', inactive: 'Inactive' } }
const wrapper = withAppMessages(app)

const OPTIONS: IOption[] = [
  { value: '1', label: msg('opts.active') },
  { value: '2', label: 'Literal' },
]

const field = (value = ''): ControllerRenderProps => ({
  name: 'status',
  value,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
})

describe('IOption.label as I18nText', () => {
  it('Combobox resolves MessageRef labels in the list and keeps literals', async () => {
    const user = userEvent.setup()
    render(<Combobox field={field()} loadOptions={async () => OPTIONS} />, { wrapper })
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument())
    expect(screen.getByText('Literal')).toBeInTheDocument()
  })

  it('Combobox shows the resolved label of the selected value in the trigger', async () => {
    render(<Combobox field={field('1')} loadOptions={async () => OPTIONS} />, { wrapper })
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Active'))
  })

  it('MultiSelect resolves MessageRef labels', async () => {
    const user = userEvent.setup()
    function Harness() {
      const { control } = useForm<FieldValues>({ defaultValues: { s: [] } })
      return (
        <MultiSelect
          control={control}
          name='s'
          loadOptions={async () => [{ value: '1', label: msg('opts.active') }, { value: '2', label: 'Literal' }]}
        />
      )
    }
    render(<Harness />, { wrapper })
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument(), { timeout: 2000 })
    expect(screen.getByText('Literal')).toBeInTheDocument()
  })

  it('StatusFilter resolves MessageRef labels and keeps literals', () => {
    render(
      <StatusFilter
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'on', label: msg('opts.active') },
        ]}
        value='all'
        onChange={vi.fn()}
      />,
      { wrapper },
    )
    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})
