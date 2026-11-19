import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModernSidebar } from './ModernSidebar'
import { TelamonjsI18nProvider } from '../i18n/context'
import { logger } from '../utils/logger'

// The dropdown-menu is replaced via resolve.alias in vitest.config.ts (not
// vi.mock) whenever the importer's specifier literally reads
// '../ui/dropdown-menu' (see src/test/a11y-smoke.test.tsx for prior art).
// ModernSidebar imports it with that exact specifier, so re-point the
// aliased module back to the real implementation -- the impersonation
// dropdown interactions this file exercises need real Radix behavior
// (click/keyboard wiring), not the flat ui-mocks.tsx stand-in.
vi.mock('../ui/dropdown-menu', async () => {
  return await vi.importActual<typeof import('../ui/dropdown-menu')>(
    new URL('../ui/dropdown-menu.tsx', import.meta.url).pathname
  )
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock stores
vi.mock('../stores/sidebar-store', () => ({
  useSidebarStore: { persist: { rehydrate: vi.fn() } },
  useSidebarState: () => ({ isOpen: true, isCompact: false }),
  useIsMobileOpen: () => false,
  useSidebarActions: () => ({
    toggleSidebar: vi.fn(),
    setMobileOpen: vi.fn(),
  }),
}))

vi.mock('../stores/menu-store', () => ({
  useMenuStack: () => [],
  useMenuActions: () => ({
    handleSectionClick: vi.fn(),
    handleBackClick: vi.fn(),
  }),
}))

// Mock toast (must be hoisted, so use vi.fn() directly in factory)
vi.mock('../hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}))

describe('ModernSidebar - Impersonation Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    menuConfig: [],
    session: {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        role: { name: 'Admin' },
      },
      isImpersonating: true,
      originalUser: {
        name: 'Original User',
      },
    },
    onSignOut: vi.fn(),
  }

  describe('Loading State', () => {
    it('should show loading state during stop impersonation', async () => {
      const user = userEvent.setup()
      let resolveStop!: () => void
      const onStopImpersonation = vi.fn().mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveStop = resolve
          })
      )

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      // Open user dropdown
      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      // Click stop impersonation button (menu stays open via onSelect preventDefault)
      const stopButton = screen.getByText('Voltar ao Original')
      await user.click(stopButton)

      // Assert: loading state visible in the still-open menu
      expect(await screen.findByText('Voltando...')).toBeInTheDocument()

      // Check for spinner (Loader2 icon)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()

      // Resolve and wait for the loading state to clear
      resolveStop()
      await waitFor(() => {
        expect(screen.queryByText('Voltando...')).not.toBeInTheDocument()
      })
    })

    it('should disable button during loading', async () => {
      const user = userEvent.setup()
      let resolveStop!: () => void
      const onStopImpersonation = vi.fn().mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveStop = resolve
          })
      )

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')
      await user.click(stopButton)

      // Menu remains open while the operation is pending
      const loadingText = await screen.findByText('Voltando...')
      const menuItem = loadingText.closest('div[role="menuitem"]')
      expect(menuItem).toHaveAttribute('aria-disabled', 'true')

      // Resolve and wait for the loading state to clear
      resolveStop()
      await waitFor(() => {
        expect(screen.queryByText('Voltando...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error toast when stop impersonation fails', async () => {
      const user = userEvent.setup()
      const { toast } = await import('../hooks/use-toast')
      const onStopImpersonation = vi
        .fn()
        .mockRejectedValue(new Error('API error'))

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')
      await user.click(stopButton)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Erro',
          description: 'Erro ao parar impersonificação. Tente novamente.',
          variant: 'destructive',
        })
      })
    })

    it('should log error when stop impersonation fails', async () => {
      const user = userEvent.setup()
      const loggerErrorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {})
      const testError = new Error('API error')
      const onStopImpersonation = vi.fn().mockRejectedValue(testError)

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')
      await user.click(stopButton)

      await waitFor(() => {
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          '[ModernSidebar] Error stopping impersonation',
          expect.objectContaining({ error: expect.anything() })
        )
      })

      loggerErrorSpy.mockRestore()
    })

    it('should reset loading state after error', async () => {
      const user = userEvent.setup()
      const { toast } = await import('../hooks/use-toast')
      const onStopImpersonation = vi
        .fn()
        .mockRejectedValue(new Error('API error'))

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')
      await user.click(stopButton)

      // Wait for error handling
      await waitFor(() => {
        expect(toast).toHaveBeenCalled()
      })

      // Menu stays open: button returns to its normal state (not loading)
      await waitFor(() => {
        expect(screen.getByText('Voltar ao Original')).toBeInTheDocument()
      })
      expect(screen.queryByText('Voltando...')).not.toBeInTheDocument()
    })
  })

  describe('Success Handling', () => {
    it('should show success toast when stop impersonation succeeds', async () => {
      const user = userEvent.setup()
      const { toast } = await import('../hooks/use-toast')
      const onStopImpersonation = vi.fn().mockResolvedValue(undefined)

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')
      await user.click(stopButton)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Sucesso',
          description: 'Você voltou ao seu usuário original',
        })
      })
    })

    it('should call onStopImpersonation exactly once', async () => {
      const user = userEvent.setup()
      const onStopImpersonation = vi.fn().mockResolvedValue(undefined)

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')
      await user.click(stopButton)

      await waitFor(() => {
        expect(onStopImpersonation).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should not trigger impersonation if already pending', async () => {
      const user = userEvent.setup()
      const onStopImpersonation = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        )

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')

      // Click multiple times rapidly
      await user.click(stopButton)
      await user.click(stopButton)
      await user.click(stopButton)

      // Should only be called once
      await waitFor(() => {
        expect(onStopImpersonation).toHaveBeenCalledTimes(1)
      })
    })

    it('should not render stop impersonation if not impersonating', () => {
      render(
        <ModernSidebar
          {...defaultProps}
          session={{
            ...defaultProps.session,
            isImpersonating: false,
          }}
          onStopImpersonation={vi.fn()}
        />
      )

      const userButton = screen.getByText('Test User')
      userEvent.click(userButton)

      expect(screen.queryByText('Voltar ao Original')).not.toBeInTheDocument()
    })

    it('should not render stop impersonation if callback not provided', () => {
      render(
        <ModernSidebar {...defaultProps} onStopImpersonation={undefined} />
      )

      const userButton = screen.getByText('Test User')
      userEvent.click(userButton)

      expect(screen.queryByText('Voltar ao Original')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on dropdown', async () => {
      const user = userEvent.setup()
      const onStopImpersonation = vi.fn().mockResolvedValue(undefined)

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      const stopButton = screen.getByText('Voltar ao Original')
      expect(stopButton.closest('div[role="menuitem"]')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      const onStopImpersonation = vi.fn().mockResolvedValue(undefined)

      render(
        <ModernSidebar
          {...defaultProps}
          onStopImpersonation={onStopImpersonation}
        />
      )

      const userButton = screen.getByText('Test User')
      await user.click(userButton)

      // Radix renders the item as a div[role="menuitem"]; the text is in a span.
      // Arrow navigation moves focus to the first enabled menu item.
      const menuItem = screen
        .getByText('Voltar ao Original')
        .closest('div[role="menuitem"]') as HTMLElement
      await user.keyboard('{ArrowDown}')
      expect(menuItem).toHaveFocus()
    })
  })
})

describe('ModernSidebar - LocaleSwitcher', () => {
  const session = {
    user: { name: 'Test User', email: 'test@example.com', role: { name: 'Admin' } },
  }

  it('lists the other configured locales in the user menu', async () => {
    const user = userEvent.setup()
    render(
      <TelamonjsI18nProvider locales={['pt-BR', 'en']}>
        <ModernSidebar menuConfig={[]} session={session} />
      </TelamonjsI18nProvider>
    )

    await user.click(screen.getByText('Test User'))

    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('hides the language item with a single locale', async () => {
    const user = userEvent.setup()
    render(
      <TelamonjsI18nProvider locales={['pt-BR']}>
        <ModernSidebar menuConfig={[]} session={session} />
      </TelamonjsI18nProvider>
    )

    await user.click(screen.getByText('Test User'))

    expect(screen.queryByText('English')).not.toBeInTheDocument()
  })

  it('hides the language item when localeSwitcher={false}', async () => {
    const user = userEvent.setup()
    render(
      <TelamonjsI18nProvider locales={['pt-BR', 'en']}>
        <ModernSidebar menuConfig={[]} session={session} localeSwitcher={false} />
      </TelamonjsI18nProvider>
    )

    await user.click(screen.getByText('Test User'))

    expect(screen.queryByText('English')).not.toBeInTheDocument()
  })
})
