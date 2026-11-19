import type { Preview } from '@storybook/react'
import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../src/index.css'
import { TelamonjsI18nProvider } from '../src/i18n/context'
import { isTelamonjsLocale } from '../src/i18n/locales'
import { telamonjsMessages } from '../src/i18n/messages'

// Apps mount one at the root; remote selectors and lists call useQuery.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const preview: Preview = {
  parameters: {
    // No argTypesRegex: implicit on* actions throw when a form calls them while
    // rendering (Storybook 8). Stories that need a spy pass fn() explicitly.
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        light: {
          name: 'light',
          value: '#ffffff',
        },

        dark: {
          name: 'dark',
          value: '#0f172a',
        },
      },
    },
    // Accessibility addon configuration
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
          { id: 'button-name', enabled: true },
          { id: 'image-alt', enabled: true },
          { id: 'link-name', enabled: true },
          { id: 'landmark-one-main', enabled: false }, // Disabled for isolated component stories
          { id: 'region', enabled: false }, // Disabled for isolated component stories
        ],
      },
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      },
    },
  },

  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'UI language (telamonjs messages)',
      defaultValue: 'pt-BR',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: ['pt-BR', 'en', 'es'],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light'
      const locale = isTelamonjsLocale(context.globals.locale)
        ? context.globals.locale
        : 'pt-BR'

      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider
            locale={locale}
            messages={telamonjsMessages[locale]}
            timeZone='America/Sao_Paulo'
          >
            <TelamonjsI18nProvider>
              <div className={theme} style={{ minHeight: '100vh' }}>
                <div className='bg-background text-foreground p-4'>
                  <Story />
                </div>
              </div>
            </TelamonjsI18nProvider>
          </NextIntlClientProvider>
        </QueryClientProvider>
      )
    },
  ],

  initialGlobals: {
    backgrounds: {
      value: 'light',
    },
  },
}

export default preview
