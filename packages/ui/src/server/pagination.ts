import { createTranslator } from 'next-intl'
import {
  createPaginationContext as createDataPaginationContext,
  type FilterLabels,
  type PaginationContext,
} from '@telamonjs/data/prisma'
import { DEFAULT_LOCALE, isTelamonjsLocale } from '../i18n/locales'
import { telamonjsMessages } from '../i18n/messages'
import { logger } from '../utils/logger'

function libraryLabels(locale: string | undefined): FilterLabels {
  const lang = isTelamonjsLocale(locale) ? locale : DEFAULT_LOCALE
  const messages = telamonjsMessages[lang]
  const common = createTranslator({ locale: lang, messages, namespace: 'telamonjs.common' })
  const pagination = createTranslator({
    locale: lang,
    messages,
    namespace: 'telamonjs.business.pagination',
  })
  return {
    yes: common('yes'),
    no: common('no'),
    active: pagination('active'),
    inactive: pagination('inactive'),
  }
}

/**
 * `@telamonjs/data/prisma`'s `createPaginationContext` with the library's
 * own filter labels (pt-BR by default, or the `locale` passed to
 * `getFilterOptions`) and warnings through the ui logger. Both stay
 * overridable through `context`.
 */
export function createPaginationContext(
  context: PaginationContext
): ReturnType<typeof createDataPaginationContext> {
  return createDataPaginationContext({
    filterLabels: libraryLabels,
    onWarning: (message: string) => logger.warn(message),
    ...context,
  })
}
