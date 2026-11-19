import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TelamonjsI18nProvider } from './context'
import { LocaleSwitcher } from './LocaleSwitcher'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    document.cookie = 'NEXT_LOCALE=; max-age=0; path=/'
    refresh.mockClear()
  })

  it('writes the cookie, notifies and refreshes', async () => {
    const onLocaleChange = vi.fn()
    render(
      <TelamonjsI18nProvider onLocaleChange={onLocaleChange}>
        <LocaleSwitcher />
      </TelamonjsI18nProvider>
    )
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en')
    expect(document.cookie).toContain('NEXT_LOCALE=en')
    expect(onLocaleChange).toHaveBeenCalledWith('en')
    expect(refresh).toHaveBeenCalled()
  })

  it('renders nothing with a single locale', () => {
    const { container } = render(
      <TelamonjsI18nProvider locales={['pt-BR']}>
        <LocaleSwitcher />
      </TelamonjsI18nProvider>
    )
    expect(container).toBeEmptyDOMElement()
  })
})
