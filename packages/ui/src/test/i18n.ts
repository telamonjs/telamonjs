import { createTranslator } from 'next-intl'
import { telamonjsMessages } from '../i18n/messages'

/** pt-BR translator for tests that call pure functions/renderers outside a React tree. */
export const t = createTranslator({ locale: 'pt-BR', messages: telamonjsMessages['pt-BR'], namespace: 'telamonjs' })
