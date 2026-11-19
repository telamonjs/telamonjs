export const TELAMONJS_LOCALES = ['pt-BR', 'en', 'es'] as const
export type TelamonjsLocale = (typeof TELAMONJS_LOCALES)[number]
export const DEFAULT_LOCALE: TelamonjsLocale = 'pt-BR'
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'
export const DEFAULT_CURRENCY = 'BRL'

export function isTelamonjsLocale(v: unknown): v is TelamonjsLocale {
  return typeof v === 'string' && (TELAMONJS_LOCALES as readonly string[]).includes(v)
}
