import type { LucideIcon } from 'lucide-react'
import type { I18nText } from '../i18n/msg'

/**
 * Static page header config — used in config.tsx files.
 * Only title/description/icon (tabs and actions are runtime, not config).
 */
export interface PageHeaderConfig {
  /** Literal or `msg()` (I18nText) — spread into `<AdminHeader {...header} />`. */
  title: I18nText
  description?: I18nText
  icon?: LucideIcon
}
