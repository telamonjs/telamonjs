'use client'

import React from 'react'
import { Input } from '../../ui/input'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer, FieldRendererProps } from './types'

export interface InputRendererOptions {
  /**
   * Default placeholder when field.placeholder is not set.
   * If a function, receives the field label and the i18n translator and
   * returns the placeholder string.
   */
  defaultPlaceholder?:
    | string
    | ((label: string, t: FieldRendererProps['t']) => string)

  /**
   * Extra static props to spread onto the Input component.
   */
  extraProps?: Record<string, unknown>

  /**
   * How to handle the onChange event:
   * - 'value': extracts e.target.value and passes it to field.onChange (e.g., TextRenderer)
   * - 'event': passes the raw event to field.onChange (e.g., URLRenderer, MonthRenderer)
   *
   * @default 'event'
   */
  onChangeTransform?: 'value' | 'event'
}

/**
 * Factory function to create simple Input-based field renderers.
 *
 * Eliminates boilerplate for renderers that share the same structure:
 * accessibility attrs, Input component with standard props (name, value, onChange, etc.)
 *
 * @param type - HTML input type (e.g., 'text', 'email', 'url')
 * @param options - Optional configuration for placeholder, extra props, onChange behavior
 * @returns A FieldRenderer object
 */
export function createInputRenderer(
  type: string,
  options?: InputRendererOptions
): FieldRenderer {
  const {
    defaultPlaceholder,
    extraProps = {},
    onChangeTransform = 'event',
  } = options || {}

  return {
    render: ({ field, t }: FieldRendererProps): React.ReactElement => {
      const accessibilityAttrs = getFieldAccessibilityAttrs({
        name: field.name,
        label: field.label,
        required: field.required,
        error: field.error,
        description: field.description,
      })

      let placeholder = field.placeholder
      if (!placeholder && defaultPlaceholder) {
        placeholder =
          typeof defaultPlaceholder === 'function'
            ? defaultPlaceholder(field.label, t)
            : defaultPlaceholder
      }

      const handleChange =
        onChangeTransform === 'value'
          ? (e: React.ChangeEvent<HTMLInputElement>) =>
              field.onChange?.(e.target.value)
          : field.onChange

      return React.createElement(Input, {
        type,
        ...accessibilityAttrs,
        ...extraProps,
        name: field.name,
        value: field.value ?? '',
        onChange: handleChange,
        onBlur: field.onBlur,
        ref: field.ref,
        placeholder,
        autoFocus: field.focus,
        readOnly: field.readOnly,
        disabled: field.disabled,
        required: field.required,
        className: field.hasError ? 'border-red-500 focus:border-red-500' : '',
      })
    },
  }
}
