'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { isMessageRef, type I18nText } from './msg'

/** Translator scoped to the library's own messages (`telamonjs.*`). */
export function useTelamonjsT() {
  return useTranslations('telamonjs')
}

/** Resolves an I18nText slot: literals pass through, refs resolve against the full message tree. */
export function useText() {
  const t = useTranslations()
  return useCallback(
    (value: I18nText | undefined): string | undefined =>
      // Keys come from consumer configs — not typed against our tree, hence the casts.
      isMessageRef(value) ? t(value.key as never, value.values as never) : value,
    [t],
  )
}

/** Internal: resolves `label: I18nText` of option-like objects (selects, filters) to plain strings. */
export function resolveLabel<O extends { label: I18nText }>(
  text: ReturnType<typeof useText>,
  option: O,
): Omit<O, 'label'> & { label: string } {
  return { ...option, label: text(option.label) ?? '' }
}
