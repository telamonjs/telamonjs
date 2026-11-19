import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

// Use the real Badge: the global mock (ui-mocks) drops className, which this
// suite asserts (custom className merging)
vi.unmock('../../ui/badge')

describe('StatusBadge', () => {
  it('renders new badge type', () => {
    render(<StatusBadge type='new' />)
    expect(screen.getByText('Novo')).toBeInTheDocument()
  })

  it('renders beta badge type', () => {
    render(<StatusBadge type='beta' />)
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('renders custom badge with label', () => {
    render(<StatusBadge type='custom' label='Custom Label' />)
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<StatusBadge type='status' label='Active' variant='success' />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders trend badge with positive value', () => {
    render(<StatusBadge type='trend' value={15.5} />)
    expect(screen.getByText('15.5%')).toBeInTheDocument()
  })

  it('renders trend badge with negative value', () => {
    render(<StatusBadge type='trend' value={-8.2} />)
    expect(screen.getByText('8.2%')).toBeInTheDocument()
  })

  it('renders trend badge with zero value', () => {
    render(<StatusBadge type='trend' value={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StatusBadge type='custom' label='Test' className='custom-class' />
    )
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders with size sm', () => {
    render(<StatusBadge type='custom' label='Small' size='sm' />)
    const badge = screen.getByText('Small')
    expect(badge).toBeInTheDocument()
  })

  it('renders with size md', () => {
    render(<StatusBadge type='custom' label='Medium' size='md' />)
    const badge = screen.getByText('Medium')
    expect(badge).toBeInTheDocument()
  })

  it('renders with size lg', () => {
    render(<StatusBadge type='custom' label='Large' size='lg' />)
    const badge = screen.getByText('Large')
    expect(badge).toBeInTheDocument()
  })

  it('renders with custom icon', () => {
    render(
      <StatusBadge
        type='custom'
        label='Icon'
        icon={<span data-testid='custom-icon'>🔥</span>}
      />
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})
