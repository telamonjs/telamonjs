'use client'

import { lazy, Suspense } from 'react'
import { useFormContext } from 'react-hook-form'
import { FileUpload } from '../../components/forms/FileUpload'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer, FieldRendererProps } from './types'
import { useTelamonjsT } from '../../i18n/use-t'

// eslint-disable-next-line react-refresh/only-export-components -- private lazy component behind the exported renderer object
const FileField = lazy(() =>
  import('../../components/FileField').then(module => ({
    default: module.FileField,
  }))
)

export const ImageRenderer: FieldRenderer = {
  render: ({ field }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <div
        {...accessibilityAttrs}
        className='p-4 border border-dashed border-border rounded-md text-center text-sm text-muted-foreground'
      >
        Image field requires external implementation
        <br />
        Field: {field.label}
      </div>
    )
  },
}

export const FileRenderer: FieldRenderer = {
  render: ({ field, id, t }) => {
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
            {t('common.loading')}
          </div>
        }
      >
        <FileField {...accessibilityAttrs} field={field} id={id} />
      </Suspense>
    )
  },
}

// Real component (not a render closure) so useFormContext respects rules-of-hooks

// Stable empty default so FileUpload's prop-change check isn't tripped each render.
const EMPTY_FILE_VALUE: string[] = []

// eslint-disable-next-line react-refresh/only-export-components -- private component behind the exported renderer object
const FileUploadField = ({ field }: FieldRendererProps) => {
  const t = useTelamonjsT()
  const formContext = useFormContext()

  const accessibilityAttrs = getFieldAccessibilityAttrs({
    name: field.name,
    label: field.label,
    required: field.required,
    error: field.error,
    description: field.description,
  })

  // Resolve dynamic uploadParams (e.g., { clienteId: 'clienteId' } -> { clienteId: 'actual-value' })
  const resolvedUploadParams = field.uploadParams
    ? Object.entries(field.uploadParams).reduce(
        (acc, [key, valueOrFieldName]) => {
          // If value is a string that matches a field name, resolve it from form
          if (typeof valueOrFieldName === 'string' && formContext) {
            const formValue = formContext.watch(valueOrFieldName)
            acc[key] = formValue || valueOrFieldName // Fallback to literal if field not found
          } else {
            acc[key] = valueOrFieldName // Use literal value
          }
          return acc
        },
        {} as Record<string, unknown>
      )
    : undefined

  return (
    <FileUpload
      {...accessibilityAttrs}
      value={field.value || EMPTY_FILE_VALUE}
      onChange={(files: File[]) => {
        // When uploadEndpoint is NOT set, pass File objects (old behavior)
        if (!field.uploadEndpoint) {
          field.onChange(files)
        }
        // When uploadEndpoint IS set, onChange will be called by onUploadComplete with URL
      }}
      accept={field.accept}
      maxFiles={field.maxFiles || 5}
      maxSize={field.maxSize || 10 * 1024 * 1024}
      disabled={field.readOnly}
      multiple={field.multiple !== false}
      showPreview={field.showPreview !== false}
      error={field.hasError ? t('validation.required') : undefined}
      uploadEndpoint={field.uploadEndpoint}
      uploadParams={resolvedUploadParams}
      onUploadComplete={metadata => {
        // After successful upload, pass URL to form field (not File object)
        field.onChange(metadata.url)
      }}
    />
  )
}

export const FileUploadRenderer: FieldRenderer = {
  render: props => <FileUploadField {...props} />,
}
