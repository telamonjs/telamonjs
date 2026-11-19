import type { I18nText } from '../../i18n/msg'
import type { useText } from '../../i18n/use-t'

/** Resolves a DialogConfig `title` slot: the item-fn form passes through untouched (the
 * dialog components call it after fetching); the I18nText form resolves once at this boundary. */
export function resolveDialogTitle<T>(
  title: I18nText | ((item: T) => string),
  text: ReturnType<typeof useText>
): string | ((item: T) => string) {
  return typeof title === 'function' ? title : ((text(title) ?? '') as string)
}
