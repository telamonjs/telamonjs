'use client'

import React from 'react'
import { Textarea } from '../../ui/textarea'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer } from './types'

export const TextareaRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <Textarea
        {...accessibilityAttrs}
        name={field.name}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
        placeholder={
          field.placeholder || t('form.enterText', { label: field.label.toLowerCase() })
        }
        rows={field.rows ?? 4}
        readOnly={field.readOnly}
        autoFocus={field.focus}
        required={field.required}
      />
    )
  },
}

export const SVGRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <Textarea
        {...accessibilityAttrs}
        value={field.value || ''}
        placeholder={t('form.svgPlaceholder')}
        onChange={(evn: React.ChangeEvent<HTMLTextAreaElement>) =>
          field.onChange(evn.target.value)
        }
        className='min-h-[120px] font-mono'
      />
    )
  },
}
