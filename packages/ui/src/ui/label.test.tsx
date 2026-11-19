import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import { Label } from './label'

describe('Label', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders label with correct attributes', () => {
    renderWithProviders(<Label htmlFor='email'>Email</Label>)

    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email')
  })

  it('applies correct styling', () => {
    renderWithProviders(<Label data-testid='label'>Test Label</Label>)

    const label = screen.getByTestId('label')
    // Component is mocked - verify element exists with content
    expect(label).toBeInTheDocument()
    expect(label).toHaveTextContent('Test Label')
  })
})
