import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BaseFormPage } from './BaseFormPage'

// Mock PageContent component
vi.mock('../layouts/PageContent', () => ({
  PageContent: ({
    children,
    title,
    description,
    variant,
  }: {
    children: React.ReactNode
    title: string
    description?: string
    variant?: 'card' | 'plain'
  }) => (
    <div data-testid='page-content' data-variant={variant}>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  ),
}))

describe('BaseFormPage', () => {
  const mockFormComponent = () => (
    <form data-testid='mock-form'>Form Content</form>
  )

  describe('Layout rendering', () => {
    it('renders form directly when no title provided', () => {
      render(<BaseFormPage formComponent={mockFormComponent()} />)

      expect(screen.getByTestId('mock-form')).toBeInTheDocument()
      expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
    })

    it('wraps form with PageContent when title provided', () => {
      render(
        <BaseFormPage
          formComponent={mockFormComponent()}
          title='Test Form'
          description='Test Description'
        />
      )

      const pageContent = screen.getByTestId('page-content')
      expect(pageContent).toBeInTheDocument()
      expect(screen.getByText('Test Form')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByTestId('mock-form')).toBeInTheDocument()
    })

    it('wraps with PageContent when title provided without description', () => {
      render(
        <BaseFormPage formComponent={mockFormComponent()} title='Test Form' />
      )

      expect(screen.getByTestId('page-content')).toBeInTheDocument()
      expect(screen.getByText('Test Form')).toBeInTheDocument()
      expect(screen.queryByText('Test Description')).not.toBeInTheDocument()
    })
  })

  describe('Variant support', () => {
    it('uses "card" variant by default when title provided', () => {
      render(
        <BaseFormPage formComponent={mockFormComponent()} title='Test Form' />
      )

      const pageContent = screen.getByTestId('page-content')
      expect(pageContent).toHaveAttribute('data-variant', 'card')
    })

    it('uses "plain" variant when explicitly set', () => {
      render(
        <BaseFormPage
          formComponent={mockFormComponent()}
          title='Test Form'
          variant='plain'
        />
      )

      const pageContent = screen.getByTestId('page-content')
      expect(pageContent).toHaveAttribute('data-variant', 'plain')
    })

    it('uses custom variant when provided', () => {
      render(
        <BaseFormPage
          formComponent={mockFormComponent()}
          title='Test Form'
          variant='card'
        />
      )

      const pageContent = screen.getByTestId('page-content')
      expect(pageContent).toHaveAttribute('data-variant', 'card')
    })
  })

  describe('Form component rendering', () => {
    it('renders ReactNode formComponent', () => {
      const customForm = (
        <div data-testid='custom-form'>
          <input type='text' />
          <button>Submit</button>
        </div>
      )

      render(<BaseFormPage formComponent={customForm} />)

      expect(screen.getByTestId('custom-form')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('renders complex form components', () => {
      const complexForm = (
        <form data-testid='complex-form'>
          <fieldset>
            <legend>Personal Info</legend>
            <input name='name' />
          </fieldset>
          <fieldset>
            <legend>Contact</legend>
            <input name='email' />
          </fieldset>
        </form>
      )

      render(<BaseFormPage formComponent={complexForm} title='Complex Form' />)

      expect(screen.getByTestId('complex-form')).toBeInTheDocument()
      expect(screen.getByText('Personal Info')).toBeInTheDocument()
      expect(screen.getByText('Contact')).toBeInTheDocument()
    })
  })

  describe('TypeScript type safety', () => {
    it('accepts formComponent as ReactNode', () => {
      const stringComponent = 'String content'
      const numberComponent = 42
      const booleanComponent = true
      const nullComponent = null

      // These should compile without errors
      render(<BaseFormPage formComponent={stringComponent} />)
      render(<BaseFormPage formComponent={numberComponent} />)
      render(<BaseFormPage formComponent={booleanComponent} />)
      render(<BaseFormPage formComponent={nullComponent} />)
    })
  })

  describe('Backward compatibility', () => {
    it('maintains behavior when used without title (like original CreatePage)', () => {
      render(<BaseFormPage formComponent={mockFormComponent()} />)

      // Should render form directly without wrapper
      expect(screen.getByTestId('mock-form')).toBeInTheDocument()
      expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
    })

    it('maintains behavior when used with title (like original CreatePage)', () => {
      render(
        <BaseFormPage
          formComponent={mockFormComponent()}
          title='Create Record'
          description='Add a new record'
        />
      )

      // Should wrap with PageContent
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
      expect(screen.getByText('Create Record')).toBeInTheDocument()
      expect(screen.getByText('Add a new record')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles empty string title', () => {
      render(<BaseFormPage formComponent={mockFormComponent()} title='' />)

      // Empty string is falsy, should render form directly
      expect(screen.getByTestId('mock-form')).toBeInTheDocument()
      expect(screen.queryByTestId('page-content')).not.toBeInTheDocument()
    })

    it('handles whitespace-only title', () => {
      render(<BaseFormPage formComponent={mockFormComponent()} title='   ' />)

      // Whitespace-only is truthy, should wrap with PageContent
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })
  })
})
