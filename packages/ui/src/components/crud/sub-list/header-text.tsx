'use client'

import * as React from 'react'
import { useText } from '../../../i18n/use-t'
import type { I18nText } from '../../../i18n/msg'

/** `SubListField.header`: plain text, `MessageRef`, or a component (`() => <Msg k='…' />`). */
export type SubListHeader = I18nText | (() => React.ReactNode)

/** Renders a sub-list header the way DataTable does (component → rendered, MessageRef → resolved). */
export function SubListHeaderText({ header }: { header: SubListHeader }) {
  const text = useText()
  if (typeof header === 'function') return <>{React.createElement(header)}</>
  return <>{text(header)}</>
}
