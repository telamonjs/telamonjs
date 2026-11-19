import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DashboardHeader } from './DashboardHeader'
import { Activity } from 'lucide-react'

describe('DashboardHeader', () => {
  // 1. Rendering tests
  describe('Rendering', () => {
    it('renders with title', () => {
      render(<DashboardHeader title='Test Dashboard' />)
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <DashboardHeader
          title='Test Dashboard'
          description='Test Description'
        />
      )
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      render(<DashboardHeader title='Test Dashboard' icon={Activity} />)
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
    })
  })

  // 2. Status indicator
  describe('Status Indicator', () => {
    it('renders online status with pulse', () => {
      render(
        <DashboardHeader title='Test' status='online' statusLabel='Online' />
      )
      expect(screen.getByText('Online')).toBeInTheDocument()
    })

    it('renders offline status', () => {
      render(
        <DashboardHeader title='Test' status='offline' statusLabel='Offline' />
      )
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('renders loading status with animation', () => {
      render(
        <DashboardHeader
          title='Test'
          status='loading'
          statusLabel='Carregando'
        />
      )
      expect(screen.getByText('Carregando')).toBeInTheDocument()
    })

    it('renders error status', () => {
      render(<DashboardHeader title='Test' status='error' statusLabel='Erro' />)
      expect(screen.getByText('Erro')).toBeInTheDocument()
    })
  })

  // 3. Search input
  describe('Search', () => {
    it('renders search input when onSearchChange provided', () => {
      render(
        <DashboardHeader
          title='Test'
          searchPlaceholder='Buscar...'
          onSearchChange={() => {}}
        />
      )
      expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
    })

    it('calls onSearchChange when typing', () => {
      const onSearchChange = vi.fn()
      render(<DashboardHeader title='Test' onSearchChange={onSearchChange} />)

      const input = screen.getByPlaceholderText('Buscar...')
      fireEvent.change(input, { target: { value: 'test' } })
      expect(onSearchChange).toHaveBeenCalledWith('test')
    })

    it('does not render search when onSearchChange not provided', () => {
      render(<DashboardHeader title='Test' />)
      expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument()
    })
  })

  // 4. Refresh functionality
  describe('Refresh', () => {
    it('renders refresh button when onRefresh provided', () => {
      render(<DashboardHeader title='Test' onRefresh={() => {}} />)
      expect(screen.getByTitle('Atualizar')).toBeInTheDocument()
    })

    it('calls onRefresh when refresh button clicked', () => {
      const onRefresh = vi.fn()
      render(<DashboardHeader title='Test' onRefresh={onRefresh} />)

      fireEvent.click(screen.getByTitle('Atualizar'))
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('disables refresh button when isRefreshing', () => {
      render(
        <DashboardHeader
          title='Test'
          onRefresh={() => {}}
          isRefreshing={true}
        />
      )
      expect(screen.getByTitle('Atualizar')).toBeDisabled()
    })

    it('renders auto-refresh toggle', () => {
      render(<DashboardHeader title='Test' onAutoRefreshToggle={() => {}} />)
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })

  // 5. Fullscreen toggle
  describe('Fullscreen', () => {
    it('renders fullscreen button when allowFullscreen and onFullscreenToggle', () => {
      render(
        <DashboardHeader
          title='Test'
          allowFullscreen={true}
          onFullscreenToggle={() => {}}
        />
      )
      expect(screen.getByTitle('Fullscreen')).toBeInTheDocument()
    })

    it('calls onFullscreenToggle when clicked', () => {
      const onFullscreenToggle = vi.fn()
      render(
        <DashboardHeader
          title='Test'
          allowFullscreen={true}
          onFullscreenToggle={onFullscreenToggle}
        />
      )

      fireEvent.click(screen.getByTitle('Fullscreen'))
      expect(onFullscreenToggle).toHaveBeenCalledTimes(1)
    })
  })

  // 6. Edit mode
  describe('Edit Mode', () => {
    it('renders edit button when onEditToggle provided', () => {
      render(<DashboardHeader title='Test' onEditToggle={() => {}} />)
      expect(screen.getByText('Editar')).toBeInTheDocument()
    })

    it('calls onEditToggle when clicked', () => {
      const onEditToggle = vi.fn()
      render(<DashboardHeader title='Test' onEditToggle={onEditToggle} />)

      fireEvent.click(screen.getByText('Editar'))
      expect(onEditToggle).toHaveBeenCalledWith(true)
    })

    it('shows "Salvar" when editable=true', () => {
      render(
        <DashboardHeader title='Test' editable={true} onEditToggle={() => {}} />
      )
      expect(screen.getByText('Salvar')).toBeInTheDocument()
    })
  })
})
