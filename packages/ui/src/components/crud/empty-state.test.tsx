import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './empty-state'

describe('EmptyState headingLevel', () => {
  it('defaults to h2', () => {
    render(<EmptyState title='Nothing' />)
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing' })).toBeInTheDocument()
  })

  it('renders the requested level', () => {
    render(<EmptyState title='Nothing' headingLevel={4} />)
    expect(screen.getByRole('heading', { level: 4, name: 'Nothing' })).toBeInTheDocument()
  })
})
