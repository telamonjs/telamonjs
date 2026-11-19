import { createTranslator, type AbstractIntlMessages } from 'next-intl'
import { z, ZodIssueCode, type ZodErrorMap } from 'zod'
import type { TelamonjsLocale } from './locales'
import type { TelamonjsMessages } from './messages'

/**
 * Zod error map over `messages` that already hold the library's `telamonjs`
 * namespace (plus the app's own keys). No locale data is imported here, so
 * client code can install it from the provider's messages without bundling
 * every locale.
 */
export function installZodErrorMap(
  locale: TelamonjsLocale,
  messages: AbstractIntlMessages
): void {
  // Typed view for strict keys; the `telamonjs` namespace comes from the library.
  const t = createTranslator({
    locale,
    messages: messages as unknown as TelamonjsMessages,
    namespace: 'telamonjs.validation',
  })
  const tAbs = createTranslator({ locale, messages })
  const map: ZodErrorMap = (issue, ctx) => {
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        return {
          message:
            issue.received === 'undefined' || issue.received === 'null'
              ? t('required')
              : t('invalid'),
        }
      case ZodIssueCode.too_small: {
        const min = Number(issue.minimum)
        if (issue.type === 'string')
          return {
            message: min === 1 ? t('required') : t('tooSmallString', { min }),
          }
        if (issue.type === 'number')
          return { message: t('tooSmallNumber', { min }) }
        if (issue.type === 'array')
          return { message: t('tooSmallArray', { min }) }
        if (issue.type === 'date')
          return { message: t('tooSmallDate', { min: new Date(min) }) }
        return { message: ctx.defaultError }
      }
      case ZodIssueCode.too_big: {
        const max = Number(issue.maximum)
        if (issue.type === 'string')
          return { message: t('tooBigString', { max }) }
        if (issue.type === 'number')
          return { message: t('tooBigNumber', { max }) }
        if (issue.type === 'array')
          return { message: t('tooBigArray', { max }) }
        if (issue.type === 'date')
          return { message: t('tooBigDate', { max: new Date(max) }) }
        return { message: ctx.defaultError }
      }
      case ZodIssueCode.invalid_string:
        if (issue.validation === 'email') return { message: t('invalidEmail') }
        if (issue.validation === 'url') return { message: t('invalidUrl') }
        if (issue.validation === 'uuid') return { message: t('invalidUuid') }
        return { message: t('invalid') }
      case ZodIssueCode.invalid_enum_value:
        return { message: t('invalidOption') }
      case ZodIssueCode.invalid_date:
        return { message: t('invalidDate') }
      case ZodIssueCode.custom: {
        // Library validators tag their issues with `params: { i18n: 'invalidCpf', values? }`
        // instead of a literal message, so refinements translate like built-in issues.
        const key = issue.params?.i18n
        if (typeof key === 'string') {
          const values = (issue.params?.values ?? {}) as never
          return {
            message: key.includes('.')
              ? tAbs(key as never, values)
              : t(key as never, values),
          }
        }
        return { message: ctx.defaultError }
      }
      default:
        return { message: ctx.defaultError }
    }
  }
  z.setErrorMap(map)
}
