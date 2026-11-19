import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSkeleton, useSkeleton } from './LoadingSkeleton'

describe('LoadingSkeleton', () => {
  it('renders card skeleton by default', () => {
    const { container } = render(<LoadingSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders multiple card skeletons', () => {
    const { container } = render(<LoadingSkeleton shape='card' count={3} />)
    const cards = container.querySelectorAll('[class*="space-y-3"]')
    expect(cards.length).toBeGreaterThanOrEqual(3)
  })

  it('renders table skeleton', () => {
    const { container } = render(
      <LoadingSkeleton shape='table' count={5} columns={4} />
    )
    const table = container.querySelector('table')
    expect(table).toBeInTheDocument()
  })

  it('renders text skeleton', () => {
    const { container } = render(<LoadingSkeleton shape='text' count={3} />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBe(3)
  })

  it('renders stat skeleton', () => {
    const { container } = render(<LoadingSkeleton shape='stat' />)
    // Stat shape renders inside a Card (mocked globally with data-testid)
    const card = container.querySelector('[data-testid="card"]')
    expect(card).toBeInTheDocument()
    // Icon skeleton uses rounded-full sizing from the stat config
    expect(
      container.querySelector('[class*="rounded-full"]')
    ).toBeInTheDocument()
  })

  it('renders avatar skeleton', () => {
    const { container } = render(<LoadingSkeleton shape='avatar' />)
    const avatar = container.querySelector('[class*="rounded-full"]')
    expect(avatar).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <LoadingSkeleton className='custom-skeleton' />
    )
    expect(container.querySelector('.custom-skeleton')).toBeInTheDocument()
  })

  it('renders table with correct columns', () => {
    const { container } = render(
      <LoadingSkeleton shape='table' count={3} columns={6} />
    )
    const headerCells = container.querySelectorAll('thead th')
    expect(headerCells.length).toBe(6)
  })

  it('renders correct number of rows for table', () => {
    const { container } = render(
      <LoadingSkeleton shape='table' count={5} columns={3} />
    )
    const bodyRows = container.querySelectorAll('tbody tr')
    expect(bodyRows.length).toBe(5)
  })

  it('renders card with correct structure', () => {
    const { container } = render(<LoadingSkeleton shape='card' />)
    // Card sub-components are mocked globally with data-testid attributes
    const header = container.querySelector('[data-testid="card-header"]')
    const content = container.querySelector('[data-testid="card-content"]')
    expect(header).toBeInTheDocument()
    expect(content).toBeInTheDocument()
  })
})

describe('useSkeleton', () => {
  it('returns correct config for card shape', () => {
    const config = useSkeleton('card')
    expect(config).toHaveProperty('title')
    expect(config).toHaveProperty('description')
    expect(config).toHaveProperty('row')
  })

  it('returns correct config for table shape', () => {
    const config = useSkeleton('table')
    expect(config).toHaveProperty('row')
    expect(config).toHaveProperty('cell')
  })

  it('returns correct config for stat shape', () => {
    const config = useSkeleton('stat')
    expect(config).toHaveProperty('icon')
    expect(config).toHaveProperty('title')
    expect(config).toHaveProperty('value')
  })
})
