'use client'

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../../test/ui-mocks'
import { AdminHeader } from './AdminHeader'
import { Home } from 'lucide-react'
import { msg } from '../../i18n/msg'
import { withAppMessages } from '../../test/intl'

// ShellPageContext returns null by default (no shell wrapping)
vi.mock('./ShellPageContext', () => ({
  useShellPage: () => null,
}))

describe('AdminHeader', () => {
  describe('Rendering', () => {
    it('renders title', () => {
      render(<AdminHeader title='Meu Estoque' />)
      expect(screen.getByText('Meu Estoque')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      render(<AdminHeader title='Estoque' description='Monitoramento' />)
      expect(screen.getByText('Monitoramento')).toBeInTheDocument()
    })

    it('does not render icon container when no icon provided', () => {
      render(<AdminHeader title='Estoque' />)
      expect(screen.queryByTestId(/^icon-/)).toBeNull()
    })
  })

  describe('Icon — string (preferred in link-mode)', () => {
    it('resolves string icon via getIcon and renders it', () => {
      render(<AdminHeader title='Estoque' icon='Home' />)
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    })

    it('resolves unknown string to Circle fallback', () => {
      render(<AdminHeader title='Estoque' icon='NonExistentXYZ' />)
      expect(screen.getByTestId('icon-circle')).toBeInTheDocument()
    })
  })

  describe('Icon — component (backward compat)', () => {
    it('renders a direct icon component', () => {
      render(<AdminHeader title='Estoque' icon={Home} />)
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders h1 with the title', () => {
      render(<AdminHeader title='Central de Alertas' />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Central de Alertas')
    })
  })

  describe('i18n', () => {
    it('resolves MessageRef title/description', () => {
      render(<AdminHeader title={msg('assets.title')} description={msg('assets.desc')} />, {
        wrapper: withAppMessages({ assets: { title: 'My Assets', desc: 'Monitoring' } }),
      })
      expect(screen.getByText('My Assets')).toBeInTheDocument()
      expect(screen.getByText('Monitoring')).toBeInTheDocument()
    })
  })
})
