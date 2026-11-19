'use client'

import { createInputRenderer } from './input-factory'
import type { FieldRenderer } from './types'

// Text-based fields using the input factory

export const TextRenderer: FieldRenderer = createInputRenderer('text', {
  defaultPlaceholder: (label, t) => t('form.enterText', { label: label.toLowerCase() }),
  onChangeTransform: 'value',
})

export const EmailRenderer: FieldRenderer = createInputRenderer('email', {
  onChangeTransform: 'value',
})

export const PasswordRenderer: FieldRenderer = createInputRenderer('password', {
  onChangeTransform: 'value',
})

export const URLRenderer: FieldRenderer = createInputRenderer('url', {
  defaultPlaceholder: 'https://example.com',
  onChangeTransform: 'event',
})

export const TelRenderer: FieldRenderer = createInputRenderer('tel', {
  defaultPlaceholder: '(00) 00000-0000',
  onChangeTransform: 'event',
})

export const MonthRenderer: FieldRenderer = createInputRenderer('month', {
  onChangeTransform: 'event',
})

export const WeekRenderer: FieldRenderer = createInputRenderer('week', {
  onChangeTransform: 'event',
})

export const SearchRenderer: FieldRenderer = createInputRenderer('search', {
  defaultPlaceholder: (_label, t) => t('common.search'),
  onChangeTransform: 'event',
})
