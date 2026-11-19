'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Edit2 } from 'lucide-react'
import type { FormSection } from '../../types/forms/admin-form'
import type { I18nText } from '../../i18n/msg'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'

export interface WizardStep {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  sections: FormSection[]
  validation?: unknown
  onEnter?: (data: unknown) => void
  /** Advancing past this step may run an async action (e.g. persist the step
   * before moving on) — return (or resolve to) `false` to block it. */
  onExit?: (data: unknown) => boolean | Promise<boolean>
}

export interface ReviewStepProps {
  data: Record<string, unknown>
  steps: WizardStep[]
  onEdit: (stepIndex: number) => void
  /**
   * Override how a field's raw value is displayed on the review screen —
   * e.g. mapping an enum's raw value to its label. Return `undefined` to
   * fall back to the built-in formatter for that field.
   */
  formatValue?: (fieldName: string, value: unknown) => React.ReactNode
}

const defaultFormatValue = (
  value: unknown,
  t: ReturnType<typeof useTelamonjsT>,
  formatDate: ReturnType<typeof useFormat>['date']
): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no')
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return value.name
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return t('form.attachedFile')
  }

  if (value instanceof Date) {
    return formatDate(value)
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'object' && 'label' in value) {
    return String((value as { label: string }).label)
  }

  if (Array.isArray(value)) {
    return value
      .map(item =>
        typeof item === 'object' && item !== null && 'label' in item
          ? String((item as { label: string }).label)
          : String(item)
      )
      .join(', ')
  }

  return String(value)
}

export function ReviewStep({ data, steps, onEdit, formatValue }: ReviewStepProps) {
  const t = useTelamonjsT()
  const text = useText()
  const { date: formatDate } = useFormat()

  return (
    <div className='space-y-6'>
      <div className='mb-8'>
        <h2 className='text-2xl font-bold text-foreground'>
          {t('form.reviewHeading')}
        </h2>
        <p className='text-sm text-muted-foreground mt-2'>
          {t('form.reviewInstructions')}
        </p>
      </div>

      {steps.map((step, stepIndex) => {
        // Get fields from all sections of this step
        const allFields = step.sections.flatMap(section => {
          // Handle both flat and nested field arrays
          if (Array.isArray(section.fields[0])) {
            return (section.fields as unknown[][]).flat()
          }
          return section.fields
        })

        // Filter only fields that have values
        const fieldsWithData = allFields.filter(
          field =>
            field &&
            typeof field === 'object' &&
            'name' in field &&
            data[field.name as string] !== undefined &&
            data[field.name as string] !== null &&
            data[field.name as string] !== ''
        )

        // Skip steps with no data
        if (fieldsWithData.length === 0) return null

        return (
          <Card key={step.id}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
              <div className='flex items-center gap-3'>
                {step.icon && (
                  <div className='text-blue-600 dark:text-blue-300'>
                    {step.icon}
                  </div>
                )}
                <div>
                  <CardTitle className='text-lg'>{step.title}</CardTitle>
                  {step.description && (
                    <p className='text-sm text-muted-foreground mt-1'>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onEdit(stepIndex)}
                className='gap-2'
                data-testid={`review-step-edit-${step.id}`}
              >
                <Edit2 className='w-4 h-4' />
                {t('common.edit')}
              </Button>
            </CardHeader>
            <CardContent>
              <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {fieldsWithData.map(field => {
                  if (
                    !field ||
                    typeof field !== 'object' ||
                    !('name' in field) ||
                    !('label' in field)
                  )
                    return null

                  const fieldName = field.name as string
                  // field.label is a real FormField.label (I18nText) at runtime —
                  // narrowed only to `unknown` here by the 'label' in field guard.
                  const fieldLabel = text(field.label as I18nText) ?? ''
                  const value = data[fieldName]
                  const displayValue =
                    formatValue?.(fieldName, value) ??
                    defaultFormatValue(value, t, formatDate)

                  return (
                    <div key={fieldName} className='space-y-1'>
                      <dt className='text-sm font-medium text-muted-foreground'>
                        {fieldLabel}
                      </dt>
                      <dd className='text-sm text-foreground'>
                        {displayValue}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
