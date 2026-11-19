import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { ReviewStep, type WizardStep } from './ReviewStep'
import { msg } from '../../i18n/msg'
import { telamonjsMessages } from '../../i18n/messages'

const appMessages = {
  form: { nameLabel: 'Full name' },
}

const steps: WizardStep[] = [
  {
    id: 'dados',
    title: 'Dados',
    sections: [
      {
        label: 'Identificação',
        fields: [{ name: 'name', label: msg('form.nameLabel'), type: 'text' }],
      },
    ],
  },
]

describe('ReviewStep i18n', () => {
  it('resolves a MessageRef field label instead of rendering it as a raw object', () => {
    render(
      <NextIntlClientProvider locale='en' messages={{ ...telamonjsMessages.en, ...appMessages }}>
        <ReviewStep data={{ name: 'Ada Lovelace' }} steps={steps} onEdit={() => {}} />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText('Full name')).toBeInTheDocument()
  })
})
