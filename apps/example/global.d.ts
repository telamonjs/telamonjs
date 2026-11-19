import type { TelamonjsMessages } from '@telamonjs/ui/i18n'
import type { AppLocale } from './src/i18n/config'
import type ptBR from './messages/pt-BR.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale
    Messages: TelamonjsMessages & typeof ptBR
  }
}
