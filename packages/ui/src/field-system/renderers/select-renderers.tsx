'use client'

import { lazy, Suspense } from 'react'
import { MultiSelect } from '../../components/selectors/MultiSelect'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer } from './types'

const Combobox = lazy(() =>
  import('../../components/selectors/combobox').then(module => ({
    default: module.Combobox,
  }))
)

export const RelationshipRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    if (!field.loadField) {
      return (
        <div className='p-2 border border-yellow-200 dark:border-yellow-900 rounded-md bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300 text-sm'>
          ⚠️ {t('form.relationshipMissingLoader')}
        </div>
      )
    }

    return (
      <Suspense
        fallback={
          <div className='p-4 text-center text-sm text-muted-foreground'>
            {t('common.loading')}
          </div>
        }
      >
        <Combobox
          {...accessibilityAttrs}
          field={field}
          loadOptions={field.loadField}
          dependsOn={field.dependsOn}
          autoFocus={field.focus}
          disabled={field.readOnly}
          label={field.label}
          placeholder={field.placeholder}
        />
      </Suspense>
    )
  },
}

export const MultiSelectRenderer: FieldRenderer = {
  render: ({ field, t }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <MultiSelect
        {...accessibilityAttrs}
        control={field.control}
        name={field.name}
        label={field.label}
        loadOptions={field.loadField || (() => Promise.resolve([]))}
        dependsOn={field.dependsOn}
        disabled={field.disabled}
        className={field.hasError ? 'border-red-500' : ''}
        placeholder={
          field.placeholder ||
          t('form.selectLabel', { label: field.label?.toLowerCase() })
        }
      />
    )
  },
}
