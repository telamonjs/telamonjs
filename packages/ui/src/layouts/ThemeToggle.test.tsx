import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import { ThemeToggle } from './ThemeToggle'

expect.extend(axeMatchers)

/** Same provider setup as AppProviders' default themeConfig. */
function renderToggle(defaultTheme = 'light') {
  return render(
    <ThemeProvider attribute='class' defaultTheme={defaultTheme} enableSystem>
      <ThemeToggle className='extra' />
    </ThemeProvider>
  )
}

const html = () => document.documentElement

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    html().className = ''
  })

  describe('Rendering', () => {
    it('renders a button with the translated label', () => {
      renderToggle()
      expect(
        screen.getByRole('button', { name: 'Alternar tema' })
      ).toBeInTheDocument()
    })

    it('renders both icons and lets the `dark` class pick one (hydration-safe)', () => {
      const { container } = renderToggle()
      const icons = container.querySelectorAll('svg')
      expect(icons).toHaveLength(2)
      expect(icons[0]).toHaveClass('dark:hidden')
      expect(icons[1]).toHaveClass('hidden', 'dark:block')
    })

    it('merges className', () => {
      renderToggle()
      expect(screen.getByRole('button')).toHaveClass('extra')
    })
  })

  describe('Interactions', () => {
    it('switches light → dark → light on <html> and persists the choice', async () => {
      const user = userEvent.setup()
      renderToggle('light')
      const button = screen.getByRole('button', { name: 'Alternar tema' })

      await user.click(button)
      expect(html()).toHaveClass('dark')
      expect(localStorage.getItem('theme')).toBe('dark')

      await user.click(button)
      expect(html()).not.toHaveClass('dark')
      expect(localStorage.getItem('theme')).toBe('light')
    })
  })

  describe('State Management', () => {
    it('starts from the persisted theme', async () => {
      localStorage.setItem('theme', 'dark')
      const user = userEvent.setup()
      renderToggle('light')
      await act(async () => {})

      await user.click(screen.getByRole('button'))
      expect(localStorage.getItem('theme')).toBe('light')
    })
  })

  describe('Edge Cases', () => {
    it('renders without a ThemeProvider (no-op click, no crash)', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)
      await user.click(screen.getByRole('button'))
      expect(html()).not.toHaveClass('dark')
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations', async () => {
      const { container } = renderToggle()
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
