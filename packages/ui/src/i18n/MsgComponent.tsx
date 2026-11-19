'use client'
// File is not `Msg.tsx`: on case-insensitive filesystems `./Msg` resolves to `./msg.ts`.

import { useTranslations } from 'next-intl'
import type { MessageRef } from './msg'

/** Translated text for ReactNode slots, e.g. TanStack `header: () => <Msg k="users.fields.name" />`. */
export function Msg({ k, values }: { k: string; values?: MessageRef['values'] }) {
  const t = useTranslations()
  return <>{t(k as never, values as never)}</>
}
