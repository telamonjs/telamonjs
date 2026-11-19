import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { BaseForm } from './BaseForm'
import { msg } from '../../i18n/msg'
import { telamonjsMessages } from '../../i18n/messages'
import type { FormSection } from '../../types/forms/admin-form'

const appMessages = {
  form: { nameLabel: 'Full name', namePlaceholder: 'Enter your name', section: 'Personal Info' },
}

const sections: FormSection[] = [
  {
    label: msg('form.section'),
    fields: [
      {
        name: 'name',
        label: msg('form.nameLabel'),
        placeholder: msg('form.namePlaceholder'),
        type: 'text',
      },
    ],
  },
]

describe('BaseForm i18n', () => {
  it('resolves MessageRef field label/placeholder and section label against app messages', () => {
    render(
      <NextIntlClientProvider locale='en' messages={{ ...telamonjsMessages.en, ...appMessages }}>
        <BaseForm sections={sections} />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText('Personal Info')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Full name' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
  })
})
