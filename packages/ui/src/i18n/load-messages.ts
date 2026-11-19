import type { TelamonjsLocale } from './locales'
import type { TelamonjsMessages } from './messages'

/**
 * Library messages of one locale, loaded on demand (each locale is its own
 * chunk). Used by AppProviders when the app doesn't pass `i18n.messages`.
 */
export async function loadTelamonjsMessages(
  locale: TelamonjsLocale
): Promise<TelamonjsMessages> {
  switch (locale) {
    case 'en':
      return (await import('./messages/en')).en
    case 'es':
      return (await import('./messages/es')).es
    default:
      return (await import('./messages/pt-BR')).ptBR
  }
}
