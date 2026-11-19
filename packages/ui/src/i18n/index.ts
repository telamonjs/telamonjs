export {
  TELAMONJS_LOCALES,
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
  DEFAULT_CURRENCY,
  isTelamonjsLocale,
  type TelamonjsLocale,
} from './locales'
export { msg, isMessageRef, type MessageRef, type I18nText } from './msg'
export { TelamonjsI18nProvider, useTelamonjsI18n, type TelamonjsI18nConfig } from './context'
export { useTelamonjsT, useText } from './use-t'
export { useFormat, useTickingNow } from './use-format'
export { useDateFnsLocale } from './use-date-fns-locale'
export { setupZodLocale } from './zod-locale'
export { Msg } from './MsgComponent'
export { telamonjsMessages, type TelamonjsMessages } from './messages'
export { LocaleSwitcher, type LocaleSwitcherProps } from './LocaleSwitcher'
export { setLocaleCookie } from './locale-cookie'

// GUARD (link-mode): never re-export anything from 'next-intl' here or from the barrel.
// With optimizePackageImports the consumer would get a second copy of the context
// (same failure class as react-query "No QueryClient set"). Apps import next-intl directly.
