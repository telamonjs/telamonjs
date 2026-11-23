'use client'

import { cn } from '../../../utils'
import { colSpanClass, gridColsClass } from '../grid-classes'
import { Label } from '../../../ui/label'
import { TEST_IDS } from '../../../utils/test-ids'
import type { ResolvedFormField, ResolvedFormSection } from '../i18n-fields'
import { hasCrudFields, getFieldError as lookupFieldError } from './helpers'
import { renderField, type AdminFormRenderContext } from './field-renderer'
import { ConditionalField } from './conditional-field'

export { renderField }

// boolean/checkbox already render `field.description` themselves (inline,
// beside the Switch/checkbox — it doubles as their visible label). Every
// other field type only gets it as an aria-describedby target (no visible
// text), so the grid/row layouts below render it once as help text.
const SELF_DESCRIBED_TYPES = new Set(['boolean', 'checkbox'])

function renderFieldDescription(field: ResolvedFormField) {
  if (!field.description || SELF_DESCRIBED_TYPES.has(field.type)) return null
  return (
    <p
      id={TEST_IDS.FORM.description(field.name)}
      className='text-xs text-muted-foreground'
    >
      {field.description}
    </p>
  )
}

/** Render a section's fields (flat, row-structured, or CRUD-only layout). */
export function renderFieldGroup<T extends Record<string, unknown>>(
  ctx: AdminFormRenderContext<T>,
  fieldsToRender:
    | readonly ResolvedFormField[]
    | readonly (readonly ResolvedFormField[])[],
  section?: ResolvedFormSection
) {
  const getFieldError = (name: string) =>
    lookupFieldError(
      ctx.form.formState.errors as Record<string, unknown>,
      name
    )
  // data.id (edit), else the form's own `id` — e.g. CrudField's create sub-form has no
  // data but carries the parent id, which `component` fields need
  const entityId = (ctx.data?.id as string | undefined) ?? ctx.id

  // Gate a field's rendered markup behind `field.visibleWhen`, when present.
  // Fields without it skip ConditionalField entirely (no useWatch, no
  // per-keystroke re-render) — see conditional-field.tsx.
  const gate = (field: ResolvedFormField, element: React.ReactElement) =>
    field.visibleWhen ? (
      <ConditionalField
        key={field.name}
        form={ctx.form}
        visibleWhen={field.visibleWhen}
      >
        {() => element}
      </ConditionalField>
    ) : (
      element
    )

  // Check if section should be hidden due to editOnly or if it contains CRUD fields
  const shouldHideSection =
    (section?.editOnly && !ctx.id) || (hasCrudFields(fieldsToRender) && !ctx.id)

  if (shouldHideSection) {
    return null
  }

  // Return null if no fields to render
  if (!fieldsToRender || fieldsToRender.length === 0) {
    return null
  }

  // Filter fields based on editOnly property
  const filterFields = (fields: readonly ResolvedFormField[]) => {
    return fields.filter(field => {
      // If field has editOnly true, only show if we have an id (edit mode)
      return !field.editOnly || !!ctx.id
    })
  }

  // Check if we have row arrays (nested structure)
  const isRowStructure =
    fieldsToRender.length > 0 && Array.isArray(fieldsToRender[0])

  if (isRowStructure) {
    // Render rows of fields
    const rows = fieldsToRender as readonly (readonly ResolvedFormField[])[]
    return (
      <div
        className='space-y-3'
        role='group'
        aria-label={section?.label || ctx.t('form.fieldsAriaLabel')}
      >
        {rows.map((row, rowIndex) => {
          // Filter fields in this row based on editOnly
          const filteredRow = filterFields(row)

          // Skip empty rows
          if (filteredRow.length === 0) return null

          // Use flexbox for rows with more than 6 fields, grid for smaller ones
          const useFlexbox = filteredRow.length > 6
          const gridCols = useFlexbox
            ? ''
            : gridColsClass(Math.min(filteredRow.length, 6))
          const containerClass = useFlexbox
            ? 'flex flex-wrap gap-3'
            : cn('grid gap-3', gridCols)

          return (
            <div key={rowIndex} className={containerClass}>
              {filteredRow.map(field => {
                const hasError = !!getFieldError(field.name)
                const spanClass = field.span
                  ? colSpanClass(field.span)
                  : field.type === 'space' || field.type === 'crud'
                    ? useFlexbox
                      ? 'w-full'
                      : colSpanClass(row.length)
                    : useFlexbox
                      ? 'flex-1 min-w-0'
                      : ''

                return gate(
                  field,
                  <div key={field.name} className={cn('space-y-1', spanClass)}>
                    {field.type !== 'space' && (
                      <Label htmlFor={field.name}>
                        {field.label}{' '}
                        {field.required && (
                          <span className='text-red-500 ml-1'>*</span>
                        )}
                      </Label>
                    )}
                    {/* aria-invalid/aria-required live on the input itself
                        (field renderer); they are not allowed on a plain
                        div (axe: aria-allowed-attr) */}
                    <div
                      className='drop-shadow-md'
                      aria-describedby={
                        hasError ? `${field.name}-error` : undefined
                      }
                    >
                      {renderField(ctx, field, entityId)}
                    </div>
                    {renderFieldDescription(field)}
                    {hasError && (
                      <>
                        <p className='text-sm text-red-500 mt-1'>
                          {getFieldError(field.name)?.message as string}
                        </p>
                        <span
                          id={`${field.name}-error`}
                          className='sr-only'
                          role='alert'
                        >
                          {getFieldError(field.name)?.message as string}
                        </span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  // Original flat structure
  const originalFields = fieldsToRender as readonly ResolvedFormField[]
  const fields = filterFields(originalFields)

  // Skip if no fields after filtering
  if (fields.length === 0) return null

  // Check if section has only CRUD fields - use flex layout for full height
  const onlyCrudFields = fields.every(f => f.type === 'crud')

  if (onlyCrudFields) {
    // Render CRUD fields with flex-1 to fill available space
    return (
      <div
        className='flex flex-col flex-1 min-h-0 gap-4'
        role='group'
        aria-label={section?.label || ctx.t('form.fieldsAriaLabel')}
      >
        {fields.map(field => {
          const hasError = !!getFieldError(field.name)
          return gate(
            field,
            <div key={field.name} className='flex-1 flex flex-col min-h-0'>
              {/* aria-invalid/aria-required live on the input itself
                  (field renderer); not allowed on a plain div */}
              <div
                className='flex-1 min-h-0'
                aria-describedby={hasError ? `${field.name}-error` : undefined}
              >
                {renderField(ctx, field, entityId)}
              </div>
              {hasError && (
                <>
                  <p className='text-sm text-red-500 mt-1'>
                    {getFieldError(field.name)?.message as string}
                  </p>
                  <span
                    id={`${field.name}-error`}
                    className='sr-only'
                    role='alert'
                  >
                    {getFieldError(field.name)?.message as string}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const gridValue = section?.grid || ctx.grid || '2'
  const gridCols = gridColsClass(gridValue)

  return (
    <div
      className={cn('grid gap-4', gridCols)}
      role='group'
      aria-label={section?.label || ctx.t('form.fieldsAriaLabel')}
    >
      {fields.map(field => {
        const hasError = !!getFieldError(field.name)
        const spanClass = field.span
          ? colSpanClass(field.span)
          : field.type === 'space' || field.type === 'crud'
            ? colSpanClass(gridValue)
            : ''

        return gate(
          field,
          <div key={field.name} className={cn('space-y-2', spanClass)}>
            {field.type !== 'space' && (
              <Label htmlFor={field.name}>
                {field.label}{' '}
                {field.required && <span className='text-red-500 ml-1'>*</span>}
              </Label>
            )}
            {/* aria-invalid/aria-required live on the input itself
                (field renderer); not allowed on a plain div */}
            <div
              className='drop-shadow-md'
              aria-describedby={hasError ? `${field.name}-error` : undefined}
            >
              {renderField(ctx, field, entityId)}
            </div>
            {renderFieldDescription(field)}
            {hasError && (
              <>
                <p className='text-sm text-red-500 mt-1'>
                  {getFieldError(field.name)?.message as string}
                </p>
                <span id={`${field.name}-error`} className='sr-only' role='alert'>
                  {getFieldError(field.name)?.message as string}
                </span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
