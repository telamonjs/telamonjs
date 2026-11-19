// next-intl typing for the library's OWN code only (`telamonjs.*` keys are checked here).
// A `.d.ts` on purpose: `tsc --emitDeclarationOnly` does not emit it, so it does NOT reach
// dist. Shipping the augmentation pinned `AppConfig.Messages` = TelamonjsMessages in the
// consumer app, and the app's `global.d.ts` (Messages: TelamonjsMessages & typeof ptBR) lost
// that fight silently under `skipLibCheck` — `useTranslations('<app namespace>')` stopped
// compiling. The app declares `AppConfig` (template: global.d.ts).
import type { TelamonjsLocale } from './locales'
import type { TelamonjsMessages } from './messages'

declare module 'next-intl' {
  interface AppConfig {
    Locale: TelamonjsLocale
    Messages: TelamonjsMessages
  }
}
