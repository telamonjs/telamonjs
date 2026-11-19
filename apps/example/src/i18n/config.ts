export const locales = ['pt-BR', 'en', 'es'] as const
export type AppLocale = (typeof locales)[number]
export const defaultLocale: AppLocale = 'pt-BR'
export const timeZone = 'America/Sao_Paulo'
export const currency = 'BRL'
