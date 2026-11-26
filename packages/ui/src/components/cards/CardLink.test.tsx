import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { telamonjsMessages } from '../../i18n/messages'
import { CardLink } from './CardLink'

describe('CardLink', () => {
  describe('Rendering', () => {
    it('renders the title', () => {
      render(<CardLink href='/x' title='My Module' />)
      expect(screen.getByText('My Module')).toBeInTheDocument()
    })

    it('renders a string SVG icon (active branch)', () => {
      const { container } = render(
        <CardLink
          href='/x'
          title='Svg'
          icon='<svg data-testid="my-svg"><circle cx="5" cy="5" r="4" /></svg>'
        />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('circle')).toBeInTheDocument()
    })

    it('renders a string SVG icon in the disabled branch', () => {
      const { container } = render(
        <CardLink
          href='/x'
          title='Svg'
          disabled
          icon='<svg data-testid="my-svg"><rect width="2" height="2" /></svg>'
        />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('rect')).toBeInTheDocument()
    })
  })

  describe('Security (XSS sanitization)', () => {
    it('strips onerror handler from img payload (active branch)', () => {
      const { container } = render(
        <CardLink
          href='/x'
          title='Icon'
          icon='<img src=x onerror="alert(1)">'
        />
      )
      const img = container.querySelector('img')
      // The img tag survives, but the event-handler attribute is removed.
      expect(img).not.toBeNull()
      expect(img?.getAttribute('onerror')).toBeNull()
      expect(container.innerHTML).not.toContain('onerror')
    })

    it('strips onerror handler from img payload (disabled branch)', () => {
      const { container } = render(
        <CardLink
          href='/x'
          title='Icon'
          disabled
          icon='<img src=x onerror="alert(1)">'
        />
      )
      expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull()
      expect(container.innerHTML).not.toContain('onerror')
    })

    it('removes <script> tags from a string icon', () => {
      const { container } = render(
        <CardLink
          href='/x'
          title='Script'
          icon='<svg></svg><script>alert(1)</script>'
        />
      )
      expect(container.querySelector('script')).toBeNull()
      expect(container.innerHTML).not.toContain('<script')
    })

    it('server HTML carries no icon markup; hydration inserts the sanitized icon', async () => {
      const ui = (
        <NextIntlClientProvider locale='pt-BR' messages={telamonjsMessages['pt-BR']} timeZone='UTC'>
          <CardLink href='/x' title='Icon' icon='<img src=x onerror="alert(1)"><script>alert(1)</script>' />
        </NextIntlClientProvider>
      )
      const html = renderToString(ui)
      expect(html).not.toContain('onerror')
      expect(html).not.toContain('<script')
      expect(html).not.toContain('<img')

      const container = document.createElement('div')
      container.innerHTML = html
      document.body.appendChild(container)
      await act(async () => {
        hydrateRoot(container, ui)
      })
      expect(container.querySelector('img')).not.toBeNull()
      expect(container.innerHTML).not.toContain('onerror')
      expect(container.querySelector('script')).toBeNull()
      container.remove()
    })
  })
})
