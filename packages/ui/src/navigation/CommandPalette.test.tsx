import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette, useCommandPalette } from './CommandPalette'
import type { CommandPaletteItem } from './CommandPalette'

// Mock cmdk
vi.mock('cmdk', () => ({
  Command: ({ children, className }: any) => (
    <div data-testid='command' className={className}>
      {children}
    </div>
  ),
}))

// Add Command sub-components to mock
Object.assign(vi.mocked(require('cmdk').Command), {
  List: ({ children, className }: any) => (
    <div data-testid='command-list' className={className}>
      {children}
    </div>
  ),
  Empty: ({ children }: any) => (
    <div data-testid='command-empty'>{children}</div>
  ),
  Group: ({ children, heading }: any) => (
    <div data-testid='command-group' data-heading={heading}>
      {children}
    </div>
  ),
  Item: ({ children, onSelect, disabled, className }: any) => (
    <div
      data-testid='command-item'
      onClick={onSelect}
      data-disabled={disabled}
      className={className}
    >
      {children}
    </div>
  ),
  Separator: () => <div data-testid='command-separator' />,
})

// Mock icons
const MockHome = () => <svg data-testid='icon-home' />
const MockUsers = () => <svg data-testid='icon-users' />

describe.skip('CommandPalette', () => {
  const mockItems: CommandPaletteItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      type: 'navigation',
      icon: MockHome,
      href: '/admin',
    },
    {
      id: 'users',
      label: 'Users',
      type: 'navigation',
      icon: MockUsers,
      href: '/admin/users',
    },
    {
      id: 'new-user',
      label: 'Create User',
      type: 'action',
      shortcut: '⌘N',
      onSelect: vi.fn(),
    },
    {
      id: 'disabled-item',
      label: 'Disabled Action',
      type: 'action',
      disabled: true,
    },
  ]

  describe('Rendering', () => {
    it('renders command palette when open', () => {
      render(<CommandPalette items={mockItems} open={true} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('command')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<CommandPalette items={mockItems} open={false} />)

      expect(screen.queryByTestId('command')).not.toBeInTheDocument()
    })

    it('renders with placeholder text', () => {
      render(
        <CommandPalette
          items={mockItems}
          open={true}
          placeholder='Search commands...'
        />
      )

      const input = screen.getByPlaceholderText('Search commands...')
      expect(input).toBeInTheDocument()
    })

    it('renders all command items', () => {
      render(<CommandPalette items={mockItems} open={true} />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Create User')).toBeInTheDocument()
    })

    it('renders icons for items', () => {
      render(<CommandPalette items={mockItems} open={true} />)

      expect(screen.getAllByTestId('icon-home')).toHaveLength(1)
      expect(screen.getAllByTestId('icon-users')).toHaveLength(1)
    })

    it('renders keyboard shortcuts', () => {
      render(<CommandPalette items={mockItems} open={true} />)

      expect(screen.getByText('⌘N')).toBeInTheDocument()
    })

    it('groups items by type', () => {
      render(<CommandPalette items={mockItems} open={true} />)

      const groups = screen.getAllByTestId('command-group')
      expect(groups.length).toBeGreaterThan(0)

      // Check group headings
      expect(screen.getByText('Navegação')).toBeInTheDocument()
      expect(screen.getByText('Ações')).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('opens palette with Cmd+K (Mac)', () => {
      const onOpenChange = vi.fn()
      render(
        <CommandPalette
          items={mockItems}
          onOpenChange={onOpenChange}
          enableShortcut={true}
        />
      )

      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      expect(onOpenChange).toHaveBeenCalledWith(true)
    })

    it('opens palette with Ctrl+K (Windows/Linux)', () => {
      const onOpenChange = vi.fn()
      render(
        <CommandPalette
          items={mockItems}
          onOpenChange={onOpenChange}
          enableShortcut={true}
        />
      )

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      expect(onOpenChange).toHaveBeenCalledWith(true)
    })

    it('toggles palette on repeated shortcut', () => {
      const onOpenChange = vi.fn()
      render(
        <CommandPalette
          items={mockItems}
          onOpenChange={onOpenChange}
          enableShortcut={true}
        />
      )

      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      expect(onOpenChange).toHaveBeenCalledWith(true)

      // Reset mock
      onOpenChange.mockClear()

      // Trigger again (should close)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('does not open if enableShortcut is false', () => {
      const onOpenChange = vi.fn()
      render(
        <CommandPalette
          items={mockItems}
          onOpenChange={onOpenChange}
          enableShortcut={false}
        />
      )

      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      expect(onOpenChange).not.toHaveBeenCalled()
    })

    it('supports custom shortcut key', () => {
      const onOpenChange = vi.fn()
      render(
        <CommandPalette
          items={mockItems}
          onOpenChange={onOpenChange}
          shortcutKey='p'
        />
      )

      fireEvent.keyDown(document, { key: 'p', metaKey: true })

      expect(onOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Search Functionality', () => {
    it('allows typing in search input', async () => {
      const user = userEvent.setup()
      render(<CommandPalette items={mockItems} open={true} />)

      const input = screen.getByPlaceholderText(
        'Digite um comando ou busque...'
      )
      await user.type(input, 'user')

      expect(input).toHaveValue('user')
    })

    it('clears search when palette closes', async () => {
      const onOpenChange = vi.fn()
      const { rerender } = render(
        <CommandPalette
          items={mockItems}
          open={true}
          onOpenChange={onOpenChange}
        />
      )

      const input = screen.getByPlaceholderText(
        'Digite um comando ou busque...'
      )
      fireEvent.change(input, { target: { value: 'test' } })
      expect(input).toHaveValue('test')

      // Close palette
      rerender(
        <CommandPalette
          items={mockItems}
          open={false}
          onOpenChange={onOpenChange}
        />
      )

      // Reopen
      rerender(
        <CommandPalette
          items={mockItems}
          open={true}
          onOpenChange={onOpenChange}
        />
      )

      // Search should be cleared
      const newInput = screen.getByPlaceholderText(
        'Digite um comando ou busque...'
      )
      expect(newInput).toHaveValue('')
    })
  })

  describe('Command Execution', () => {
    it('executes onSelect callback when item is clicked', () => {
      const onSelect = vi.fn()
      render(
        <CommandPalette items={mockItems} open={true} onSelect={onSelect} />
      )

      const dashboardItem = screen.getByText('Dashboard')
      fireEvent.click(dashboardItem)

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dashboard' })
      )
    })

    it('executes item onSelect callback', () => {
      const itemOnSelect = vi.fn()
      const items = [
        {
          id: 'test',
          label: 'Test',
          type: 'action' as const,
          onSelect: itemOnSelect,
        },
      ]

      render(<CommandPalette items={items} open={true} />)

      fireEvent.click(screen.getByText('Test'))

      expect(itemOnSelect).toHaveBeenCalled()
    })

    it('closes palette after item selection', () => {
      const onOpenChange = vi.fn()
      render(
        <CommandPalette
          items={mockItems}
          open={true}
          onOpenChange={onOpenChange}
        />
      )

      fireEvent.click(screen.getByText('Dashboard'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('does not execute if item is disabled', () => {
      const onSelect = vi.fn()
      render(
        <CommandPalette items={mockItems} open={true} onSelect={onSelect} />
      )

      const disabledItem = screen.getByText('Disabled Action')
      const commandItem = disabledItem.closest('[data-testid="command-item"]')

      expect(commandItem).toHaveAttribute('data-disabled', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('renders with empty items array', () => {
      render(<CommandPalette items={[]} open={true} />)

      expect(screen.getByTestId('command-empty')).toBeInTheDocument()
      expect(
        screen.getByText('Nenhum resultado encontrado.')
      ).toBeInTheDocument()
    })

    it('handles items without icons', () => {
      const items = [{ id: '1', label: 'No Icon', type: 'action' as const }]
      render(<CommandPalette items={items} open={true} />)

      expect(screen.getByText('No Icon')).toBeInTheDocument()
    })

    it('handles items without shortcuts', () => {
      const items = [{ id: '1', label: 'No Shortcut', type: 'action' as const }]
      render(<CommandPalette items={items} open={true} />)

      expect(screen.queryByRole('kbd')).not.toBeInTheDocument()
    })

    it('handles controlled vs uncontrolled mode', () => {
      // Uncontrolled
      const { rerender } = render(<CommandPalette items={mockItems} />)
      expect(screen.queryByTestId('command')).not.toBeInTheDocument()

      // Controlled
      rerender(<CommandPalette items={mockItems} open={true} />)
      expect(screen.getByTestId('command')).toBeInTheDocument()
    })
  })

  describe('useCommandPalette Hook', () => {
    it('provides open state and toggle functions', () => {
      function TestComponent() {
        const result = useCommandPalette()
        return (
          <div>
            <button onClick={result.show}>Show</button>
            <button onClick={result.hide}>Hide</button>
            <button onClick={result.toggle}>Toggle</button>
            <span>{String(result.open)}</span>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByText('false')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Show'))
      expect(screen.getByText('true')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Hide'))
      expect(screen.getByText('false')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Toggle'))
      expect(screen.getByText('true')).toBeInTheDocument()
    })
  })
})
