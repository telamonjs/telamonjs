import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Home } from 'lucide-react'
import { SemanticCard } from './SemanticCard'

describe('SemanticCard heading level', () => {
  it('renders h3 by default', () => {
    render(<SemanticCard title='T' icon={Home} color='blue'>x</SemanticCard>)
    expect(screen.getByRole('heading', { level: 3, name: 'T' })).toBeInTheDocument()
  })
  it('renders h2 when headingLevel=2', () => {
    render(<SemanticCard title='T' icon={Home} color='blue' headingLevel={2}>x</SemanticCard>)
    expect(screen.getByRole('heading', { level: 2, name: 'T' })).toBeInTheDocument()
  })
})
