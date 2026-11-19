import type { AbstractIntlMessages } from 'next-intl'
import type { TelamonjsLocale } from './locales'
import { telamonjsMessages } from './messages'
import { installZodErrorMap } from './zod-error-map'

/**
 * Installs a zod error map that speaks `locale` for the common issue codes.
 * Custom `message`s in schemas always win (zod only consults the map when none is given).
 *
 * `params: { i18n: key }` on custom issues: a key WITHOUT a dot is relative to
 * `telamonjs.validation` (library validators); a key WITH a dot is absolute
 * (`'forms.validation.placa'`, `'telamonjs.common.required'`), resolved against the library
 * messages merged with `appMessages` — pass the app's messages for its own keys.
 */
export function setupZodLocale(
  locale: TelamonjsLocale,
  appMessages?: AbstractIntlMessages
): void {
  installZodErrorMap(locale, { ...telamonjsMessages[locale], ...appMessages })
}
