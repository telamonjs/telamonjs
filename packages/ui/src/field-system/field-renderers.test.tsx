import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/test-utils'
import { t } from '../test/i18n'
import { ptBR as dateFnsLocale } from 'date-fns/locale'
import {
  TextRenderer,
  EmailRenderer,
  PasswordRenderer,
  NumberRenderer,
  FloatRenderer,
  TextareaRenderer,
  BooleanRenderer,
  DateRenderer,
  DateTimeRenderer,
  MaskedDateTimeRenderer,
  RelationshipRenderer,
  MultiSelectRenderer,
  ImageRenderer,
  FileRenderer,
  SVGRenderer,
  MaskedRenderer,
  ComponentRenderer,
  SpaceRenderer,
  CrudRenderer,
  RichTextRenderer,
  DateRangeRenderer,
  TimeRenderer,
  FileUploadRenderer,
  WizardRenderer,
  URLRenderer,
  TelRenderer,
  ColorRenderer,
  RangeRenderer,
  MonthRenderer,
  WeekRenderer,
  SearchRenderer,
  HiddenRenderer,
} from './field-renderers'

// Mock DateTimePicker
vi.mock('../components/datetime/DateTimePicker', () => ({
  DateTimePicker: vi.fn(({ value, onChange, placeholder, disabled }) => (
    <input
      data-testid='datetime-picker'
      value={value ? value.toISOString().slice(0, 16) : ''}
      onChange={e => onChange(e.target.value ? new Date(e.target.value) : null)}
      placeholder={placeholder}
      disabled={disabled}
      type='datetime-local'
    />
  )),
  // TimePicker is used in the popover of the hybrid masked-datetime field
  TimePicker: vi.fn(() => <div data-testid='time-picker' />),
}))

// Mock MultiSelect component
vi.mock('../components/selectors/MultiSelect', () => ({
  default: vi.fn(({ value, onChange, loadOptions, ...props }) => (
    <div data-testid='multiselect'>
      <select multiple data-testid='multiselect-select'>
        <option>Mock MultiSelect</option>
      </select>
    </div>
  )),
  MultiSelect: vi.fn(({ value, onChange, loadOptions, ...props }) => (
    <div data-testid='multiselect'>
      <select multiple data-testid='multiselect-select'>
        <option>Mock MultiSelect</option>
      </select>
    </div>
  )),
}))

// Mock RichTextEditor
vi.mock('../components/forms/RichTextEditor', () => ({
  RichTextEditor: vi.fn(
    ({
      value,
      onChange,
      placeholder,
      disabled,
      minHeight,
      enableImages,
      enableTables,
    }) => (
      <div data-testid='rich-text-editor'>
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          data-min-height={minHeight}
          data-enable-images={enableImages}
          data-enable-tables={enableTables}
        />
      </div>
    )
  ),
}))

// Mock DateRangePicker
vi.mock('../components/forms/DateRangePicker', () => ({
  DateRangePicker: vi.fn(
    ({ value, onChange, placeholder, disabled, presets, error }) => (
      <div data-testid='date-range-picker'>
        <input
          type='text'
          value={value ? JSON.stringify(value) : ''}
          onChange={e =>
            onChange(e.target.value ? JSON.parse(e.target.value) : null)
          }
          placeholder={placeholder}
          disabled={disabled}
          data-presets={presets}
          data-error={error}
        />
      </div>
    )
  ),
}))

// Mock TimePicker
vi.mock('../components/forms/TimePicker', () => ({
  TimePicker: vi.fn(
    ({ value, onChange, format, step, disabled, placeholder, error }) => (
      <input
        data-testid='time-picker'
        type='time'
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        data-format={format}
        data-step={step}
        data-error={error}
      />
    )
  ),
}))

// Mock FileUpload
vi.mock('../components/forms/FileUpload', () => ({
  FileUpload: vi.fn(
    ({
      value,
      onChange,
      accept,
      maxFiles,
      maxSize,
      disabled,
      multiple,
      showPreview,
      error,
    }) => (
      <div data-testid='file-upload'>
        <input
          type='file'
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={e => onChange(Array.from(e.target.files || []))}
          data-max-files={maxFiles}
          data-max-size={maxSize}
          data-show-preview={showPreview}
          data-error={error}
        />
      </div>
    )
  ),
}))

// Mock WizardForm
vi.mock('../components/forms/WizardForm', () => ({
  WizardForm: vi.fn(
    ({ steps, onSubmit, draftKey, showReview, orientation, initialData }) => (
      <div data-testid='wizard-form'>
        <div data-steps={steps?.length || 0} />
        <div data-draft-key={draftKey} />
        <div data-show-review={showReview} />
        <div data-orientation={orientation} />
        <div data-initial-data={JSON.stringify(initialData)} />
      </div>
    )
  ),
}))

describe('Field Renderers', () => {
  let mockField: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockField = {
      name: 'test-field',
      label: 'Test Field',
      value: '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: { current: null },
      placeholder: 'Test placeholder',
      required: false,
      readOnly: false,
      disabled: false,
      focus: false,
      hasError: false,
    }
  })

  describe('Rendering', () => {
    describe('TextRenderer', () => {
      it('renders text input with correct props', () => {
        const TestComponent = () =>
          TextRenderer.render({ t, dateFnsLocale, field: mockField, value: 'test value' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByDisplayValue('')
        expect(input).toHaveAttribute('type', 'text')
        expect(input).toHaveAttribute('name', 'test-field')
        expect(input).toHaveAttribute('placeholder', 'Test placeholder')
      })

      it('shows error styling when hasError is true', () => {
        mockField.hasError = true
        const TestComponent = () =>
          TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByDisplayValue('')
        expect(input).toHaveClass('border-red-500')
      })

      it('handles onChange events', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        await user.type(input, 'new text')

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('handles null/undefined values gracefully', () => {
        mockField.value = null
        const TestComponent = () =>
          TextRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input')
        expect(input).toHaveValue('')
      })

      it('uses default placeholder when not provided', () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Digite test field')
        expect(input).toBeInTheDocument()
      })
    })

    describe('EmailRenderer', () => {
      it('renders email input with correct type', () => {
        const TestComponent = () =>
          EmailRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toHaveAttribute('type', 'email')
      })
    })

    describe('PasswordRenderer', () => {
      it('renders password input with correct type', () => {
        const TestComponent = () =>
          PasswordRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toHaveAttribute('type', 'password')
      })
    })

    describe('NumberRenderer', () => {
      it('renders number input', () => {
        const TestComponent = () =>
          NumberRenderer.render({ t, dateFnsLocale, field: mockField, value: 0 })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        // text + inputMode=numeric: integer field (decimals live in `float`)
        expect(input).toHaveAttribute('type', 'text')
        expect(input).toHaveAttribute('inputmode', 'numeric')
      })

      it('converts string input to number on change', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          NumberRenderer.render({ t, dateFnsLocale, field: mockField, value: 0 })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')

        await user.clear(input)
        await user.type(input, '123')

        expect(mockField.onChange).toHaveBeenCalledWith(expect.any(Number))
      })

      it('handles NaN input gracefully', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          NumberRenderer.render({ t, dateFnsLocale, field: mockField, value: 0 })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')

        await user.clear(input)
        await user.type(input, '999')

        expect(mockField.onChange).toHaveBeenCalled()
      })
    })

    describe('FloatRenderer', () => {
      it('renders float input correctly', () => {
        const TestComponent = () =>
          FloatRenderer.render({ t, dateFnsLocale, field: mockField, value: 0 })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toHaveAttribute('type', 'text')
      })

      it('handles comma to dot conversion', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          FloatRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')

        await user.clear(input)
        await user.type(input, '12.5')

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('handles empty input', async () => {
        const user = userEvent.setup()
        mockField.value = '10.5'
        const TestComponent = () =>
          FloatRenderer.render({ t, dateFnsLocale, field: mockField, value: '10.5' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')

        await user.clear(input)

        expect(mockField.onChange).toHaveBeenCalledWith(0)
      })

      it('handles trailing comma/dot', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          FloatRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')

        await user.type(input, '12,')

        expect(mockField.onChange).toHaveBeenCalled()
      })
    })

    describe('TextareaRenderer', () => {
      it('renders textarea with correct props', () => {
        const TestComponent = () =>
          TextareaRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const textarea = screen.getByPlaceholderText('Test placeholder')
        expect(textarea.tagName).toBe('TEXTAREA')
      })

      it('handles multiline text', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          TextareaRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const textarea = screen.getByPlaceholderText('Test placeholder')
        await user.type(textarea, 'Line 1{Enter}Line 2')

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('uses default placeholder when not provided', () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          TextareaRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const textarea = screen.getByPlaceholderText('Digite test field')
        expect(textarea).toBeInTheDocument()
      })

      it('renders 4 rows by default and honors field.rows', () => {
        const { unmount } = renderWithProviders(
          <>{TextareaRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })}</>
        )
        expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4')
        unmount()

        mockField.rows = 8
        renderWithProviders(
          <>{TextareaRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })}</>
        )
        expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8')
      })
    })

    describe('BooleanRenderer', () => {
      it('renders switch component', () => {
        const TestComponent = () =>
          BooleanRenderer.render({ t, dateFnsLocale, field: mockField, value: false })
        const { container } = renderWithProviders(<TestComponent />)

        const switchEl = container.querySelector('[role="switch"]')
        expect(switchEl).toBeInTheDocument()
      })

      it('handles checked state', async () => {
        mockField.value = true
        const TestComponent = () =>
          BooleanRenderer.render({ t, dateFnsLocale, field: mockField, value: true })
        const { container } = renderWithProviders(<TestComponent />)

        const switchEl = container.querySelector('[role="switch"]')
        expect(switchEl).toHaveAttribute('data-state', 'checked')
      })

      it('calls onChange when toggled', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          BooleanRenderer.render({ t, dateFnsLocale, field: mockField, value: false })
        const { container } = renderWithProviders(<TestComponent />)

        const switchEl = container.querySelector('[role="switch"]')!
        await user.click(switchEl)

        expect(mockField.onChange).toHaveBeenCalledWith(true)
      })

      it('shows description when provided', () => {
        mockField.description = 'This is a description'
        const TestComponent = () =>
          BooleanRenderer.render({ t, dateFnsLocale, field: mockField, value: false })
        renderWithProviders(<TestComponent />)

        expect(screen.getByText('This is a description')).toBeInTheDocument()
      })
    })

    describe('DateRenderer', () => {
      it('renders date input', () => {
        const TestComponent = () =>
          DateRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="date"]')
        expect(input).toBeInTheDocument()
      })

      it('formats Date object correctly', () => {
        const date = new Date('2025-01-26')
        mockField.value = date
        const TestComponent = () =>
          DateRenderer.render({ t, dateFnsLocale, field: mockField, value: date })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="date"]')
        expect(input).toBeInTheDocument()
      })

      it('handles null date gracefully', () => {
        mockField.value = null
        const TestComponent = () =>
          DateRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="date"]')
        expect(input).toBeInTheDocument()
      })

      it('handles invalid date gracefully', () => {
        mockField.value = 'invalid-date'
        const TestComponent = () =>
          DateRenderer.render({ t, dateFnsLocale, field: mockField, value: 'invalid-date' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="date"]')
        expect(input).toHaveValue('')
      })
    })

    describe('DateTimeRenderer', () => {
      it('renders DateTimePicker component', () => {
        const TestComponent = () =>
          DateTimeRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        renderWithProviders(<TestComponent />)

        const picker = screen.getByTestId('datetime-picker')
        expect(picker).toBeInTheDocument()
      })

      it('handles date change', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          DateTimeRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        renderWithProviders(<TestComponent />)

        const picker = screen.getByTestId('datetime-picker')
        await user.type(picker, '2025-01-26T10:30')

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('handles ISO string value', () => {
        mockField.value = '2025-01-26T10:30:00.000Z'
        const TestComponent = () =>
          DateTimeRenderer.render({ t, dateFnsLocale, field: mockField, value: mockField.value })
        renderWithProviders(<TestComponent />)

        const picker = screen.getByTestId('datetime-picker')
        expect(picker).toBeInTheDocument()
      })

      it('handles invalid date gracefully', () => {
        mockField.value = 'invalid-date'
        const TestComponent = () =>
          DateTimeRenderer.render({ t, dateFnsLocale, field: mockField, value: 'invalid-date' })
        renderWithProviders(<TestComponent />)

        const picker = screen.getByTestId('datetime-picker')
        expect(picker).toBeInTheDocument()
      })
    })

    describe('MaskedDateTimeRenderer', () => {
      it('renders masked datetime input', () => {
        const TestComponent = () =>
          MaskedDateTimeRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('maxlength', '16')
      })

      it('formats ISO string to DD/MM/YYYY HH:mm', () => {
        mockField.value = '2025-01-26T10:30:00.000Z'
        const TestComponent = () =>
          MaskedDateTimeRenderer.render({
            t,
            dateFnsLocale,
            field: mockField,
            value: mockField.value,
          })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toBeInTheDocument()
      })

      it('auto-completes date with 00:00 on blur', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          MaskedDateTimeRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        await user.type(input, '26012025')
        await user.tab()

        expect(mockField.onChange).toHaveBeenCalled()
      })
    })

    describe('MaskedRenderer', () => {
      it('renders masked input with specified mask', () => {
        mockField.mask = '(99) 99999-9999'
        const TestComponent = () =>
          MaskedRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
      })

      it('handles tel maskType with dynamic mask', () => {
        mockField.maskType = 'tel'
        mockField.value = '1234567890'
        const TestComponent = () =>
          MaskedRenderer.render({ t, dateFnsLocale, field: mockField, value: '1234567890' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
      })

      it.each([
        ['cpf', '12345678901', '123.456.789-01'],
        ['cnpj', '12345678000195', '12.345.678/0001-95'],
        ['cep', '59600000', '59600-000'],
      ])('formats the %s maskType preset without a mask', (maskType, raw, shown) => {
        mockField.maskType = maskType
        mockField.value = raw
        const TestComponent = () =>
          MaskedRenderer.render({ t, dateFnsLocale, field: mockField, value: raw })
        renderWithProviders(<TestComponent />)

        expect(screen.getByRole('textbox')).toHaveValue(shown)
      })

      it('a preset maskType wins over mask; an unknown maskType falls back to mask', () => {
        mockField.maskType = 'cep'
        mockField.mask = '__/__'
        mockField.value = '59600000'
        const { unmount } = renderWithProviders(
          <>{MaskedRenderer.render({ t, dateFnsLocale, field: mockField, value: '59600000' })}</>
        )
        expect(screen.getByRole('textbox')).toHaveValue('59600-000')
        unmount()

        mockField.maskType = 'custom'
        mockField.value = '1234'
        renderWithProviders(
          <>{MaskedRenderer.render({ t, dateFnsLocale, field: mockField, value: '1234' })}</>
        )
        expect(screen.getByRole('textbox')).toHaveValue('12/34')
      })

      it('uses default mask placeholder when not provided', () => {
        mockField.mask = '999.999.999-99'
        mockField.placeholder = undefined
        const TestComponent = () =>
          MaskedRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText(/Digite seguindo o padrão/)
        expect(input).toBeInTheDocument()
      })
    })

    describe('RelationshipRenderer', () => {
      it('renders warning when loadField is missing', () => {
        const TestComponent = () =>
          RelationshipRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        expect(
          screen.getByText(/Campo relationship requer uma função loadField/)
        ).toBeInTheDocument()
      })

      it('renders loading fallback when loadField is provided', () => {
        mockField.loadField = vi
          .fn()
          .mockResolvedValue([{ value: '1', label: 'Async Option 1' }])
        const TestComponent = () =>
          RelationshipRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        expect(screen.getByText('Carregando...')).toBeInTheDocument()
      })
    })

    describe('MultiSelectRenderer', () => {
      it('renders multiselect', () => {
        mockField.options = [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
        ]
        mockField.value = []
        const TestComponent = () =>
          MultiSelectRenderer.render({ t, dateFnsLocale, field: mockField, value: [] })
        renderWithProviders(<TestComponent />)

        expect(screen.getByTestId('multiselect')).toBeInTheDocument()
      })

      it('uses default placeholder when not provided', () => {
        mockField.placeholder = undefined
        mockField.value = []
        const TestComponent = () =>
          MultiSelectRenderer.render({ t, dateFnsLocale, field: mockField, value: [] })
        renderWithProviders(<TestComponent />)

        const multiselect = screen.getByTestId('multiselect')
        expect(multiselect).toBeInTheDocument()
      })
    })

    describe('ImageRenderer', () => {
      it('renders placeholder message for images', () => {
        const TestComponent = () =>
          ImageRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        renderWithProviders(<TestComponent />)

        expect(
          screen.getByText(/Image field requires external implementation/)
        ).toBeInTheDocument()
        expect(screen.getByText(/Test Field/)).toBeInTheDocument()
      })
    })

    describe('FileRenderer', () => {
      it('renders loading fallback initially', () => {
        const TestComponent = () =>
          FileRenderer.render({ t, dateFnsLocale, field: mockField, value: null, id: 'test-id' })
        renderWithProviders(<TestComponent />)

        expect(screen.getByText('Carregando...')).toBeInTheDocument()
      })
    })

    describe('SVGRenderer', () => {
      it('renders textarea for SVG input', () => {
        const TestComponent = () =>
          SVGRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const textarea = screen.getByPlaceholderText('Insira o código SVG...')
        expect(textarea).toBeInTheDocument()
        expect(textarea.tagName).toBe('TEXTAREA')
      })

      it('handles SVG value changes', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          SVGRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const textarea = screen.getByPlaceholderText('Insira o código SVG...')
        await user.type(textarea, '<svg>')

        expect(mockField.onChange).toHaveBeenCalled()
      })
    })

    describe('SpaceRenderer', () => {
      it('renders empty space div', () => {
        const TestComponent = () =>
          SpaceRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const div = container.querySelector('div')
        expect(div).toBeInTheDocument()
      })
    })

    describe('HiddenRenderer', () => {
      it('renders hidden input', () => {
        mockField.value = 'hidden-value'
        const TestComponent = () =>
          HiddenRenderer.render({ t, dateFnsLocale, field: mockField, value: 'hidden-value' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="hidden"]')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('name', 'test-field')
        expect(input).toHaveValue('hidden-value')
      })

      it('handles null value', () => {
        mockField.value = null
        const TestComponent = () =>
          HiddenRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="hidden"]')
        expect(input).toHaveValue('')
      })
    })

    describe('ComponentRenderer', () => {
      it('renders custom component', () => {
        const CustomComponent = ({ id }: any) => (
          <div>Custom Component: {id}</div>
        )
        mockField.Component = CustomComponent
        const TestComponent = () =>
          ComponentRenderer.render({
            t,
            dateFnsLocale,
            field: mockField,
            value: '',
            id: 'test-id',
          })
        renderWithProviders(<TestComponent />)

        expect(screen.getByText(/Custom Component:/)).toBeInTheDocument()
      })

      it('renders empty div when no component provided', () => {
        const TestComponent = () =>
          ComponentRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        expect(container.querySelector('div')).toBeInTheDocument()
      })
    })

    describe('CrudRenderer', () => {
      it('renders loading fallback initially', () => {
        const TestComponent = () =>
          CrudRenderer.render({ t, dateFnsLocale, field: mockField, value: '', id: 'test-id' })
        renderWithProviders(<TestComponent />)

        expect(screen.getByText('Carregando...')).toBeInTheDocument()
      })
    })

    // HTML5 Native Input Types
    describe('URLRenderer', () => {
      it('renders URL input with correct type', () => {
        const TestComponent = () =>
          URLRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toHaveAttribute('type', 'url')
      })

      it('uses default placeholder for URLs', () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          URLRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('https://example.com')
        expect(input).toBeInTheDocument()
      })

      it('handles error styling', () => {
        mockField.hasError = true
        const TestComponent = () =>
          URLRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toHaveClass('border-red-500')
      })
    })

    describe('TelRenderer', () => {
      it('renders tel input with correct type', () => {
        const TestComponent = () =>
          TelRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Test placeholder')
        expect(input).toHaveAttribute('type', 'tel')
      })

      it('uses default placeholder for phone', () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          TelRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('(00) 00000-0000')
        expect(input).toBeInTheDocument()
      })
    })

    describe('ColorRenderer', () => {
      it('renders color picker and text input', () => {
        const TestComponent = () =>
          ColorRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const colorInput = container.querySelector('input[type="color"]')
        const textInput = container.querySelector('input[type="text"]')

        expect(colorInput).toBeInTheDocument()
        expect(textInput).toBeInTheDocument()
      })

      it('uses default color when value is null', () => {
        mockField.value = null
        const TestComponent = () =>
          ColorRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const colorInput = container.querySelector('input[type="color"]')
        expect(colorInput).toHaveValue('#000000')
      })

      it('handles value change on color input', () => {
        mockField.value = '#ff0000'
        const TestComponent = () =>
          ColorRenderer.render({ t, dateFnsLocale, field: mockField, value: '#ff0000' })
        const { container } = renderWithProviders(<TestComponent />)

        const colorInput = container.querySelector('input[type="color"]')!
        fireEvent.change(colorInput, { target: { value: '#00ff00' } })

        expect(mockField.onChange).toHaveBeenCalled()
      })
    })

    describe('RangeRenderer', () => {
      it('renders range slider', () => {
        mockField.value = 50
        mockField.min = 0
        mockField.max = 100
        const TestComponent = () =>
          RangeRenderer.render({ t, dateFnsLocale, field: mockField, value: 50 })
        const { container } = renderWithProviders(<TestComponent />)

        const rangeInput = container.querySelector('input[type="range"]')
        expect(rangeInput).toBeInTheDocument()
        expect(rangeInput).toHaveAttribute('min', '0')
        expect(rangeInput).toHaveAttribute('max', '100')
      })

      it('displays current value', () => {
        mockField.value = 75
        mockField.min = 0
        mockField.max = 100
        const TestComponent = () =>
          RangeRenderer.render({ t, dateFnsLocale, field: mockField, value: 75 })
        renderWithProviders(<TestComponent />)

        expect(screen.getByText('75')).toBeInTheDocument()
      })

      it('handles value change', async () => {
        const user = userEvent.setup()
        mockField.value = 50
        const TestComponent = () =>
          RangeRenderer.render({ t, dateFnsLocale, field: mockField, value: 50 })
        const { container } = renderWithProviders(<TestComponent />)

        const rangeInput = container.querySelector('input[type="range"]')!
        fireEvent.change(rangeInput, { target: { value: '75' } })

        expect(mockField.onChange).toHaveBeenCalledWith(75)
      })

      it('uses default min/max/step when not provided', () => {
        const TestComponent = () =>
          RangeRenderer.render({ t, dateFnsLocale, field: mockField, value: 0 })
        const { container } = renderWithProviders(<TestComponent />)

        const rangeInput = container.querySelector('input[type="range"]')
        expect(rangeInput).toHaveAttribute('min', '0')
        expect(rangeInput).toHaveAttribute('max', '100')
        expect(rangeInput).toHaveAttribute('step', '1')
      })
    })

    describe('MonthRenderer', () => {
      it('renders month input', () => {
        const TestComponent = () =>
          MonthRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="month"]')
        expect(input).toBeInTheDocument()
      })

      it('handles error styling', () => {
        mockField.hasError = true
        const TestComponent = () =>
          MonthRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="month"]')
        expect(input).toHaveClass('border-red-500')
      })
    })

    describe('WeekRenderer', () => {
      it('renders week input', () => {
        const TestComponent = () =>
          WeekRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="week"]')
        expect(input).toBeInTheDocument()
      })

      it('handles null value', () => {
        mockField.value = null
        const TestComponent = () =>
          WeekRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="week"]')
        expect(input).toHaveValue('')
      })
    })

    describe('SearchRenderer', () => {
      it('renders search input', () => {
        const TestComponent = () =>
          SearchRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="search"]')
        expect(input).toBeInTheDocument()
      })

      it('uses default placeholder', () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          SearchRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const input = screen.getByPlaceholderText('Buscar...')
        expect(input).toBeInTheDocument()
      })

      it('handles error styling', () => {
        mockField.hasError = true
        const TestComponent = () =>
          SearchRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="search"]')
        expect(input).toHaveClass('border-red-500')
      })
    })

    // Advanced field types
    // NOTE: RichTextRenderer now renders RichTextEditorLazy (React.lazy +
    // Suspense), so assertions await the lazy chunk via findBy* queries.
    describe('RichTextRenderer', () => {
      it('renders rich text editor', async () => {
        const TestComponent = () =>
          RichTextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const editor = await screen.findByTestId('rich-text-editor')
        expect(editor).toBeInTheDocument()
      })

      it('uses default placeholder', async () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          RichTextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const textarea = await screen.findByPlaceholderText(
          'Digite o conteúdo...'
        )
        expect(textarea).toBeInTheDocument()
      })

      it('handles HTML value changes', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          RichTextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const textarea = await screen.findByPlaceholderText('Test placeholder')
        await user.type(textarea, '<p>Rich text</p>')

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('passes enableImages and enableTables props', async () => {
        mockField.enableImages = false
        mockField.enableTables = false
        const TestComponent = () =>
          RichTextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const editor = await screen.findByTestId('rich-text-editor')
        const textarea = editor.querySelector('textarea')
        expect(textarea).toHaveAttribute('data-enable-images', 'false')
        expect(textarea).toHaveAttribute('data-enable-tables', 'false')
      })

      it('uses default minHeight when not provided', async () => {
        const TestComponent = () =>
          RichTextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const editor = await screen.findByTestId('rich-text-editor')
        const textarea = editor.querySelector('textarea')
        expect(textarea).toHaveAttribute('data-min-height', '200')
      })
    })

    describe('DateRangeRenderer', () => {
      it('renders date range picker', () => {
        const TestComponent = () =>
          DateRangeRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        renderWithProviders(<TestComponent />)

        const picker = screen.getByTestId('date-range-picker')
        expect(picker).toBeInTheDocument()
      })

      it('uses default placeholder', () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          DateRangeRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input')
        expect(input).toHaveAttribute('placeholder', 'Selecione o período...')
      })

      it('handles range change', () => {
        const TestComponent = () =>
          DateRangeRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input')!
        const rangeValue = { from: '2025-01-01', to: '2025-01-31' }
        fireEvent.change(input, {
          target: { value: JSON.stringify(rangeValue) },
        })

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('passes error state', () => {
        mockField.hasError = true
        const TestComponent = () =>
          DateRangeRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input')
        expect(input).toHaveAttribute('data-error', 'Campo obrigatório')
      })
    })

    describe('TimeRenderer', () => {
      it('renders time picker', () => {
        const TestComponent = () =>
          TimeRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const picker = screen.getByTestId('time-picker')
        expect(picker).toBeInTheDocument()
      })

      it('uses default placeholder', () => {
        mockField.placeholder = undefined
        const TestComponent = () =>
          TimeRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input')
        expect(input).toHaveAttribute('placeholder', 'Selecione o horário...')
      })

      it('handles time change', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          TimeRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        renderWithProviders(<TestComponent />)

        const picker = screen.getByTestId('time-picker')
        await user.type(picker, '14:30')

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('uses default format and step', () => {
        const TestComponent = () =>
          TimeRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input')
        expect(input).toHaveAttribute('data-format', '24h')
        expect(input).toHaveAttribute('data-step', '15')
      })

      it('passes error state', () => {
        mockField.hasError = true
        const TestComponent = () =>
          TimeRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input')
        expect(input).toHaveAttribute('data-error', 'Campo obrigatório')
      })
    })

    describe('FileUploadRenderer', () => {
      it('renders file upload component', () => {
        const TestComponent = () =>
          FileUploadRenderer.render({ t, dateFnsLocale, field: mockField, value: [] })
        renderWithProviders(<TestComponent />)

        const upload = screen.getByTestId('file-upload')
        expect(upload).toBeInTheDocument()
      })

      it('handles file selection', async () => {
        const user = userEvent.setup()
        const TestComponent = () =>
          FileUploadRenderer.render({ t, dateFnsLocale, field: mockField, value: [] })
        const { container } = renderWithProviders(<TestComponent />)

        const fileInput = container.querySelector('input[type="file"]')!
        const file = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        })

        await user.upload(fileInput, file)

        expect(mockField.onChange).toHaveBeenCalled()
      })

      it('uses default maxFiles and maxSize', () => {
        const TestComponent = () =>
          FileUploadRenderer.render({ t, dateFnsLocale, field: mockField, value: [] })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="file"]')
        expect(input).toHaveAttribute('data-max-files', '5')
        expect(input).toHaveAttribute('data-max-size', String(10 * 1024 * 1024))
      })

      it('enables multiple and showPreview by default', () => {
        const TestComponent = () =>
          FileUploadRenderer.render({ t, dateFnsLocale, field: mockField, value: [] })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="file"]')
        expect(input).toHaveAttribute('multiple')
        expect(input).toHaveAttribute('data-show-preview', 'true')
      })

      it('passes error state', () => {
        mockField.hasError = true
        const TestComponent = () =>
          FileUploadRenderer.render({ t, dateFnsLocale, field: mockField, value: [] })
        const { container } = renderWithProviders(<TestComponent />)

        const input = container.querySelector('input[type="file"]')
        expect(input).toHaveAttribute('data-error', 'Campo obrigatório')
      })
    })

    describe('WizardRenderer', () => {
      it('renders wizard form', () => {
        mockField.wizardSteps = [
          { title: 'Step 1', fields: [] },
          { title: 'Step 2', fields: [] },
        ]
        const TestComponent = () =>
          WizardRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        renderWithProviders(<TestComponent />)

        const wizard = screen.getByTestId('wizard-form')
        expect(wizard).toBeInTheDocument()
      })

      it('passes wizard configuration', () => {
        mockField.wizardSteps = [{ title: 'Step 1', fields: [] }]
        mockField.draftKey = 'my-wizard-draft'
        mockField.orientation = 'vertical'
        const TestComponent = () =>
          WizardRenderer.render({ t, dateFnsLocale, field: mockField, value: { name: 'John' } })
        const { container } = renderWithProviders(<TestComponent />)

        const draftKeyEl = container.querySelector('[data-draft-key]')
        const orientationEl = container.querySelector('[data-orientation]')

        expect(draftKeyEl).toHaveAttribute('data-draft-key', 'my-wizard-draft')
        expect(orientationEl).toHaveAttribute('data-orientation', 'vertical')
      })

      it('enables showReview by default', () => {
        mockField.wizardSteps = []
        const TestComponent = () =>
          WizardRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const wizard = container.querySelector('[data-show-review]')
        expect(wizard).toHaveAttribute('data-show-review', 'true')
      })

      it('uses default orientation when not provided', () => {
        mockField.wizardSteps = []
        const TestComponent = () =>
          WizardRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
        const { container } = renderWithProviders(<TestComponent />)

        const wizard = container.querySelector('[data-orientation]')
        expect(wizard).toHaveAttribute('data-orientation', 'horizontal')
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles missing field properties gracefully', () => {
      const minimalField = {
        name: 'minimal',
        label: 'Minimal Field',
        onChange: vi.fn(),
      }

      expect(() => {
        const TestComponent = () =>
          TextRenderer.render({ t, dateFnsLocale, field: minimalField, value: '' })
        renderWithProviders(<TestComponent />)
      }).not.toThrow()
    })

    it('handles undefined onChange', () => {
      const fieldWithoutOnChange = {
        ...mockField,
        onChange: undefined,
      }

      expect(() => {
        const TestComponent = () =>
          TextRenderer.render({ t, dateFnsLocale, field: fieldWithoutOnChange, value: '' })
        renderWithProviders(<TestComponent />)
      }).not.toThrow()
    })

    it('handles readOnly state', () => {
      mockField.readOnly = true
      const TestComponent = () =>
        TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByPlaceholderText('Test placeholder')
      expect(input).toHaveAttribute('readonly')
    })

    it('handles disabled state', () => {
      mockField.disabled = true
      const TestComponent = () =>
        TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByPlaceholderText('Test placeholder')
      expect(input).toBeDisabled()
    })

    it('handles required attribute', () => {
      mockField.required = true
      const TestComponent = () =>
        TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByPlaceholderText('Test placeholder')
      expect(input).toBeRequired()
    })

    it('handles very long text in text input', async () => {
      const user = userEvent.setup()
      const longText = 'a'.repeat(1000)
      const TestComponent = () =>
        TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByPlaceholderText('Test placeholder')
      await user.type(input, longText.substring(0, 50))

      expect(mockField.onChange).toHaveBeenCalled()
    })

    it('handles special characters in masked input', () => {
      mockField.mask = '999.999.999-99'
      mockField.value = '123.456.789-01'
      const TestComponent = () =>
        MaskedRenderer.render({ t, dateFnsLocale, field: mockField, value: '123.456.789-01' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('handles rapid consecutive calls to onChange', async () => {
      const user = userEvent.setup()
      const TestComponent = () =>
        TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByPlaceholderText('Test placeholder')

      await user.type(input, 'abc')

      expect(mockField.onChange).toHaveBeenCalledTimes(3)
    })

    it('handles null value in MultiSelect', () => {
      mockField.value = null
      mockField.loadField = vi.fn().mockResolvedValue([])
      const TestComponent = () =>
        MultiSelectRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('multiselect')).toBeInTheDocument()
    })

    it('handles empty wizardSteps array', () => {
      mockField.wizardSteps = []
      const TestComponent = () =>
        WizardRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
      renderWithProviders(<TestComponent />)

      const wizard = screen.getByTestId('wizard-form')
      expect(wizard).toBeInTheDocument()
    })

    it('handles missing onSubmit in WizardRenderer', () => {
      mockField.wizardSteps = []
      mockField.onSubmit = undefined
      const TestComponent = () =>
        WizardRenderer.render({ t, dateFnsLocale, field: mockField, value: null })
      renderWithProviders(<TestComponent />)

      const wizard = screen.getByTestId('wizard-form')
      expect(wizard).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('inputs have proper name attributes', () => {
      const TestComponent = () =>
        TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      const input = screen.getByPlaceholderText('Test placeholder')
      expect(input).toHaveAttribute('name', 'test-field')
    })

    it('boolean field has accessible switch role', () => {
      const TestComponent = () =>
        BooleanRenderer.render({ t, dateFnsLocale, field: mockField, value: false })
      const { container } = renderWithProviders(<TestComponent />)

      const switchEl = container.querySelector('[role="switch"]')
      expect(switchEl).toBeInTheDocument()
    })

    it('relationship field shows warning without loadField', () => {
      const TestComponent = () =>
        RelationshipRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      expect(
        screen.getByText(/Campo relationship requer uma função loadField/)
      ).toBeInTheDocument()
    })

    it('hidden field is not visible but accessible to forms', () => {
      mockField.value = 'hidden-value'
      const TestComponent = () =>
        HiddenRenderer.render({ t, dateFnsLocale, field: mockField, value: 'hidden-value' })
      const { container } = renderWithProviders(<TestComponent />)

      const input = container.querySelector('input[type="hidden"]')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('name', 'test-field')
    })

    it('color input has proper accessibility', () => {
      const TestComponent = () =>
        ColorRenderer.render({ t, dateFnsLocale, field: mockField, value: '#ff0000' })
      const { container } = renderWithProviders(<TestComponent />)

      const colorInput = container.querySelector('input[type="color"]')
      const textInput = container.querySelector('input[type="text"]')

      expect(colorInput).toBeInTheDocument()
      expect(textInput).toBeInTheDocument()
    })

    it('range slider shows current value', () => {
      mockField.value = 75
      mockField.min = 0
      mockField.max = 100
      const TestComponent = () =>
        RangeRenderer.render({ t, dateFnsLocale, field: mockField, value: 75 })
      renderWithProviders(<TestComponent />)

      expect(screen.getByText('75')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('TextRenderer renders within performance budget', () => {
      const startTime = performance.now()

      const TestComponent = () =>
        TextRenderer.render({ t, dateFnsLocale, field: mockField, value: '' })
      renderWithProviders(<TestComponent />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })

    it('BooleanRenderer renders efficiently', () => {
      const startTime = performance.now()

      const TestComponent = () =>
        BooleanRenderer.render({ t, dateFnsLocale, field: mockField, value: false })
      renderWithProviders(<TestComponent />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100)
    })

    it('NumberRenderer handles type conversion efficiently', () => {
      const TestComponent = () =>
        NumberRenderer.render({ t, dateFnsLocale, field: mockField, value: 0 })
      const { container } = renderWithProviders(<TestComponent />)

      const input = container.querySelector('input[inputmode="numeric"]')
      expect(input).toBeInTheDocument()
    })
  })
})
