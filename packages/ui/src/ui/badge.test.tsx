import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Real Badge (the global mock simplifies the markup)
vi.unmock('./badge')

import { Badge } from './badge'

describe('Badge', () => {
  it('renderiza como <span> (elemento inline — válido dentro de <p>)', () => {
    render(
      <p>
        Texto com <Badge data-testid='badge'>destaque</Badge> inline
      </p>
    )

    const badge = screen.getByTestId('badge')
    expect(badge.tagName).toBe('SPAN')
    expect(badge).toHaveTextContent('destaque')
  })

  it('aplica variant e mescla className customizada', () => {
    render(
      <Badge data-testid='badge' variant='destructive' className='mx-1'>
        erro
      </Badge>
    )

    const badge = screen.getByTestId('badge')
    expect(badge.className).toContain('bg-destructive')
    expect(badge.className).toContain('mx-1')
    expect(badge.className).toContain('inline-flex')
  })

  // Merged from ui-components.test.tsx (same Badge target).
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>)

    const badge = screen.getByText('Default')
    expect(badge.className).toContain('bg-primary')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant='secondary'>Secondary</Badge>)

    let badge = screen.getByText('Secondary')
    expect(badge.className).toContain('bg-secondary')

    rerender(<Badge variant='destructive'>Destructive</Badge>)
    badge = screen.getByText('Destructive')
    expect(badge.className).toContain('bg-destructive')

    rerender(<Badge variant='outline'>Outline</Badge>)
    badge = screen.getByText('Outline')
    expect(badge.className).toContain('text-foreground')
  })

  it('renders badge content correctly', () => {
    render(<Badge>Custom Badge Text</Badge>)

    const badge = screen.getByText('Custom Badge Text')
    expect(badge).toBeInTheDocument()
    expect(badge.tagName).toBe('SPAN')
  })
})
