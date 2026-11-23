import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { DialogHeaderContent } from './DialogHeaderContent'
import { msg } from '../../i18n/msg'
import { telamonjsMessages } from '../../i18n/messages'
import { withAppMessages } from '../../test/intl'
import type { DialogHeaderConfig } from '../../types/dialog-header'

const appMessages = {
  dialog: {
    userTitle: 'User details',
    userSubtitle: 'Code {code}',
    trips: 'Trips',
    active: 'Active',
    assets: '{count, plural, one {# asset} other {# assets}}',
  },
}

interface User {
  name: string
  code: string
  trips: number
  ativo: boolean
}

const user: User = { name: 'Ana', code: 'A1', trips: 3, ativo: true }

const config: DialogHeaderConfig<User> = {
  icon: 'User',
  iconColor: 'blue',
  title: msg('dialog.userTitle'),
}

describe('DialogHeaderContent i18n', () => {
  it('resolves a MessageRef title (msg("dialog.userTitle")) against app messages in the active locale', () => {
    render(
      <NextIntlClientProvider locale='en' messages={{ ...telamonjsMessages.en, ...appMessages }}>
        <DialogHeaderContent<User> item={user} config={config} mode='view' />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText('User details')).toBeInTheDocument()
  })

  it('subtitle(item) may return a MessageRef', () => {
    render(
      <DialogHeaderContent<User>
        item={user}
        config={{ ...config, subtitle: (u) => msg('dialog.userSubtitle', { code: u.code }) }}
        mode='view'
      />,
      { wrapper: withAppMessages(appMessages) },
    )
    expect(screen.getByText('Code A1')).toBeInTheDocument()
  })

  it('subtitle(item) returning a string keeps working', () => {
    render(<DialogHeaderContent<User> item={user} config={{ ...config, subtitle: (u) => u.code }} mode='view' />, {
      wrapper: withAppMessages(appMessages),
    })
    expect(screen.getByText('A1')).toBeInTheDocument()
  })

  describe('stats', () => {
    it('renders string label/value as-is (legacy)', () => {
      render(
        <DialogHeaderContent<User>
          item={user}
          config={{
            ...config,
            stats: { items: [{ label: 'Viagens', value: (u) => u.trips, icon: 'Route', color: 'blue' }] },
          }}
          mode='view'
        />,
        { wrapper: withAppMessages(appMessages) },
      )
      expect(screen.getByText('Viagens')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('resolves MessageRef label, static MessageRef value and value(item) returning a MessageRef', () => {
      render(
        <DialogHeaderContent<User>
          item={user}
          config={{
            ...config,
            stats: {
              items: [
                { label: msg('dialog.trips'), value: (u) => msg('dialog.assets', { count: u.trips }), icon: 'Route', color: 'blue' },
                { label: 'Status', value: msg('dialog.active'), icon: 'Check', color: 'green' },
              ],
            },
          }}
          mode='view'
        />,
        { wrapper: withAppMessages(appMessages) },
      )
      expect(screen.getByText('Trips')).toBeInTheDocument()
      expect(screen.getByText('3 assets')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('badge.getLabel may return a MessageRef', () => {
    render(
      <DialogHeaderContent<User>
        item={user}
        config={{
          ...config,
          badge: { field: 'ativo', variants: { true: 'default' }, getLabel: () => msg('dialog.active') },
        }}
        mode='view'
      />,
      { wrapper: withAppMessages(appMessages) },
    )
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('badge.getLabel returning a string keeps working', () => {
    render(
      <DialogHeaderContent<User>
        item={user}
        config={{ ...config, badge: { field: 'ativo', variants: { true: 'default' }, getLabel: u => u.code } }}
        mode='view'
      />,
      { wrapper: withAppMessages(appMessages) },
    )
    expect(screen.getByText('A1')).toBeInTheDocument()
  })
})
