import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { User, Settings } from 'lucide-react'
import { DetailCardHeader } from './DetailCardHeader'

describe('DetailCardHeader', () => {
  it('renders with title only', () => {
    render(<DetailCardHeader title='Test Header' />)
    expect(screen.getByText('Test Header')).toBeInTheDocument()
  })

  it('renders with description', () => {
    render(
      <DetailCardHeader title='Test Header' description='Header description' />
    )
    expect(screen.getByText('Header description')).toBeInTheDocument()
  })

  it('renders with LucideIcon', () => {
    render(<DetailCardHeader title='Test Header' icon={User} />)
    const icon = screen.getByTestId('icon-user')
    expect(icon).toBeInTheDocument()
  })

  it('renders with badge', () => {
    render(
      <DetailCardHeader
        title='Test Header'
        badge={<span data-testid='badge'>Active</span>}
      />
    )
    expect(screen.getByTestId('badge')).toBeInTheDocument()
  })

  it('renders with actions', () => {
    render(
      <DetailCardHeader
        title='Test Header'
        actions={<button data-testid='action-btn'>Edit</button>}
      />
    )
    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
  })

  it('renders with size sm', () => {
    const { container } = render(
      <DetailCardHeader title='Small Header' size='sm' />
    )
    const title = container.querySelector('.text-base')
    expect(title).toBeInTheDocument()
  })

  it('renders with size md (default)', () => {
    const { container } = render(
      <DetailCardHeader title='Medium Header' size='md' />
    )
    const title = container.querySelector('.text-lg')
    expect(title).toBeInTheDocument()
  })

  it('renders with size lg', () => {
    const { container } = render(
      <DetailCardHeader title='Large Header' size='lg' />
    )
    const title = container.querySelector('.text-xl')
    expect(title).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <DetailCardHeader title='Test' className='custom-class' />
    )
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('applies custom titleClassName', () => {
    const { container } = render(
      <DetailCardHeader title='Test' titleClassName='custom-title' />
    )
    expect(container.querySelector('.custom-title')).toBeInTheDocument()
  })

  it('applies custom descriptionClassName', () => {
    render(
      <DetailCardHeader
        title='Test'
        description='Desc'
        descriptionClassName='custom-description'
      />
    )
    const description = screen.getByText('Desc')
    expect(description).toHaveClass('custom-description')
  })

  it('renders with all props combined', () => {
    render(
      <DetailCardHeader
        title='Full Header'
        description='Complete header'
        icon={Settings}
        badge={<span data-testid='badge'>Beta</span>}
        actions={<button data-testid='action'>Save</button>}
        size='lg'
        className='border-b'
        titleClassName='font-bold'
        descriptionClassName='text-gray-500'
      />
    )

    expect(screen.getByText('Full Header')).toBeInTheDocument()
    expect(screen.getByText('Complete header')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    expect(screen.getByTestId('action')).toBeInTheDocument()
  })
})
