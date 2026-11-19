import type { TelamonjsLocale } from './locales'

/** Cookie next-intl's middleware reads on the next request to pick the locale. */
export function setLocaleCookie(locale: TelamonjsLocale): void {
  document.cookie = `NEXT_LOCALE=${locale}; max-age=31536000; path=/; SameSite=Lax`
}
