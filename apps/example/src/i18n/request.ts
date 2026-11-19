import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { telamonjsMessages } from '@telamonjs/ui/i18n'
import { defaultLocale, locales, timeZone, type AppLocale } from './config'

const isLocale = (v: string): v is AppLocale => (locales as readonly string[]).includes(v)

/** cookie NEXT_LOCALE -> Accept-Language -> defaultLocale */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): AppLocale {
  if (cookie && isLocale(cookie)) return cookie
  for (const part of (acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase()
    if (!tag) continue
    const hit = locales.find(l => l.toLowerCase() === tag) ?? locales.find(l => l.split('-')[0] === tag.split('-')[0])
    if (hit) return hit
  }
  return defaultLocale
}

export default getRequestConfig(async () => {
  const locale = pickLocale((await cookies()).get('NEXT_LOCALE')?.value, (await headers()).get('accept-language'))
  const app = (await import(`../../messages/${locale}.json`)).default
  // Namespaces never overlap (lib = `telamonjs`, app = per module) -- a shallow merge is enough.
  return { locale, timeZone, messages: { ...telamonjsMessages[locale], ...app } }
})
