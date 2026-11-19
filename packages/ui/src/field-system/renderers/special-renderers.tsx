'use client'

import { lazy, Suspense } from 'react'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer } from './types'

const CrudField = lazy(() => import('../../components/crud/crud-field'))

export const ComponentRenderer: FieldRenderer = {
  render: ({ field, id, value }) =>
    field.Component ? (
      <field.Component {...field} id={id || ''} value={value} />
    ) : (
      <div />
    ),
}

export const SpaceRenderer: FieldRenderer = {
  render: () => <div className='flex-1' />,
}

export const HiddenRenderer: FieldRenderer = {
  render: ({ field, value }) => (
    <input
      type='hidden'
      name={field.name}
      value={(value as string) || ''}
      data-testid={`field-${field.name}`}
    />
  ),
}

export const CrudRenderer: FieldRenderer = {
  render: ({ field, id }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <Suspense
        fallback={
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Carregando...
          </div>
        }
      >
        <CrudField {...accessibilityAttrs} field={field} id={id} />
      </Suspense>
    )
  },
}
