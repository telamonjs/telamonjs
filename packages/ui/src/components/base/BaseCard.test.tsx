import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { User, Mail } from 'lucide-react'
import { BaseCard } from './BaseCard'

describe('BaseCard', () => {
  it('renders with title and children', () => {
    render(
      <BaseCard title='Test Card'>
        <p>Card content</p>
      </BaseCard>
    )

    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders with description', () => {
    render(
      <BaseCard title='Test Card' description='Card description'>
        <p>Content</p>
      </BaseCard>
    )

    expect(screen.getByText('Card description')).toBeInTheDocument()
  })

  it('renders with LucideIcon component', () => {
    render(
      <BaseCard title='Test Card' icon={User}>
        <p>Content</p>
      </BaseCard>
    )

    const icon = screen.getByTestId('icon-user')
    expect(icon).toBeInTheDocument()
  })

  it('renders with ReactNode icon', () => {
    render(
      <BaseCard
        title='Test Card'
        icon={<span data-testid='custom-icon'>📧</span>}
      >
        <p>Content</p>
      </BaseCard>
    )

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders with headerBadge', () => {
    render(
      <BaseCard
        title='Test Card'
        headerBadge={<span data-testid='badge'>New</span>}
      >
        <p>Content</p>
      </BaseCard>
    )

    expect(screen.getByTestId('badge')).toBeInTheDocument()
  })

  it('renders loading state with all skeletons', () => {
    render(
      <BaseCard title='Test Card' isLoading={true}>
        <p>Content</p>
      </BaseCard>
    )

    const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(2)
  })

  it('renders loading state without icon skeleton', () => {
    render(
      <BaseCard
        title='Test Card'
        isLoading={true}
        loadingSkeletons={{ icon: false }}
      >
        <p>Content</p>
      </BaseCard>
    )

    const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('applies custom className', () => {
    const { container } = render(
      <BaseCard title='Test Card' className='custom-class'>
        <p>Content</p>
      </BaseCard>
    )

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('applies custom iconClassName', () => {
    render(
      <BaseCard
        title='Test Card'
        icon={User}
        iconClassName='h-8 w-8 text-blue-500'
      >
        <p>Content</p>
      </BaseCard>
    )

    const icon = document.querySelector('svg')
    expect(icon).toHaveClass('h-8', 'w-8', 'text-blue-500')
  })

  it('applies custom headerClassName', () => {
    const { container } = render(
      <BaseCard title='Test Card' headerClassName='custom-header'>
        <p>Content</p>
      </BaseCard>
    )

    expect(container.querySelector('.custom-header')).toBeInTheDocument()
  })

  it('applies custom contentClassName', () => {
    const { container } = render(
      <BaseCard title='Test Card' contentClassName='custom-content'>
        <p>Content</p>
      </BaseCard>
    )

    expect(container.querySelector('.custom-content')).toBeInTheDocument()
  })

  it('renders without title', () => {
    render(
      <BaseCard>
        <p>Content only</p>
      </BaseCard>
    )

    expect(screen.getByText('Content only')).toBeInTheDocument()
    expect(screen.queryByText('Test Card')).not.toBeInTheDocument()
  })

  it('renders complex children', () => {
    render(
      <BaseCard title='Test Card'>
        <div>
          <p>Line 1</p>
          <p>Line 2</p>
          <button>Click me</button>
        </div>
      </BaseCard>
    )

    expect(screen.getByText('Line 1')).toBeInTheDocument()
    expect(screen.getByText('Line 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders with all props combined', () => {
    render(
      <BaseCard
        title='Full Card'
        description='Complete card with all props'
        icon={Mail}
        iconClassName='h-6 w-6'
        headerBadge={<span data-testid='badge'>Beta</span>}
        className='border-2'
        headerClassName='bg-gray-100'
        contentClassName='p-8'
      >
        <p>Rich content</p>
      </BaseCard>
    )

    expect(screen.getByText('Full Card')).toBeInTheDocument()
    expect(screen.getByText('Complete card with all props')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    expect(screen.getByText('Rich content')).toBeInTheDocument()
  })
})
