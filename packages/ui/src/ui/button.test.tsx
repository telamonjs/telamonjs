/**
 * Button Accessibility Tests
 *
 * Validates the REAL Button accessibility contract (data-testid passthrough,
 * loading/aria-busy/disabled). The global mock in test/ui-mocks.tsx hardcodes
 * data-testid="button" and ignores `loading`, so unmock it here.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

vi.unmock('./button')
import { Button } from './button'

// Merged from ui-components.test.tsx (same Button target). That suite
// exercised the GLOBAL button mock (data-testid="button", data-variant,
// data-size attributes); rewritten here for the REAL component, which
// forwards props as-is and encodes variant/size as CSS classes instead.
describe('Button', () => {
  it('renders and forwards children', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant='secondary'>Secondary</Button>)

    let button = screen.getByRole('button')
    expect(button.className).toContain('bg-secondary')

    rerender(<Button variant='destructive'>Destructive</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('bg-destructive')

    rerender(<Button variant='outline'>Outline</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('border-input')

    rerender(<Button variant='ghost'>Ghost</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('hover:bg-accent')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size='sm'>Small</Button>)

    let button = screen.getByRole('button')
    expect(button.className).toContain('h-9')

    rerender(<Button size='lg'>Large</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('h-11')

    rerender(<Button size='icon'>Icon</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('h-10 w-10')
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('supports asChild prop', () => {
    render(
      <Button asChild>
        <a href='/test'>Link Button</a>
      </Button>
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test')
    // asChild prop should be handled by Slot component
    expect(link).toBeInTheDocument()
  })
})

describe('Button Accessibility', () => {
  it('renders with data-testid', () => {
    render(<Button data-testid='test-button'>Click me</Button>)
    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })

  it('renders with aria-label', () => {
    render(<Button aria-label='Submit form'>Submit</Button>)
    expect(screen.getByLabelText('Submit form')).toBeInTheDocument()
  })

  it('shows loading state with aria-busy', () => {
    render(
      <Button loading={true} data-testid='loading-button'>
        Save
      </Button>
    )
    const button = screen.getByTestId('loading-button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('data-loading', 'true')
    expect(button).toBeDisabled()
  })

  it('disables button when loading', () => {
    render(<Button loading={true}>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
