'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import {
  Controller,
  FieldError,
  FieldValues,
  FormProvider,
  useForm,
  UseFormReturn,
} from 'react-hook-form'
import { getFieldRenderer } from '../../field-system/field-registry'
import { Button } from '../../ui/button'
import { cn } from '../../utils'
import { ValidationErrors } from './ValidationErrors'
import { ChevronLeft, ChevronRight, Loader2, Save, X } from 'lucide-react'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'
import {
  resolveFormSections,
  type ResolvedFormField,
  type ResolvedFormSection,
} from './i18n-fields'

// Import centralized types
import type { FormField, FormSection } from '../../types/forms/admin-form'

import type {
  FormMetadata,
  ButtonVariant,
  ConfirmDialogConfig,
  BaseFormActionConfig,
  BaseFormCustomAction,
  BaseFormActionsConfig,
  BaseFormProps,
} from '../../types/forms/base-form'

// Re-export types for backward compatibility
export type {
  FormField,
  FormSection,
  FormMetadata,
  ButtonVariant,
  ConfirmDialogConfig,
  BaseFormActionConfig,
  BaseFormCustomAction,
  BaseFormActionsConfig,
  BaseFormProps,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create debounced callback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `any[]` is required for the generic function constraint (idiomatic; `unknown[]` breaks inference)
function createDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      callback(...args)
      timeoutId = null
    }, delayMs)
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook: useFormStateObserver
 * Manages onStateChange callback with debouncing
 */
function useFormStateObserver<T extends Record<string, unknown>>(
  form: UseFormReturn<FieldValues>,
  onStateChange:
    | ((values: T, metadata: FormMetadata) => void | Promise<void>)
    | undefined,
  debounceMs: number,
  id?: string
): void {
  const [isPending] = useState(false)
  // Count lives in a ref: a state counter as effect dep tore down the watch
  // subscription on every keystroke.
  const changeCountRef = useRef(0)

  useEffect(() => {
    if (!onStateChange) return

    // One debouncer per subscription (created per event it never debounced).
    const debounced = createDebouncedCallback(onStateChange, debounceMs)

    const subscription = form.watch(values => {
      changeCountRef.current += 1

      const metadata: FormMetadata = {
        isValid: form.formState.isValid,
        errors: Object.entries(form.formState.errors).reduce(
          (acc, [key, error]) => {
            acc[key] = [error?.message as string]
            return acc
          },
          {} as Record<string, string[]>
        ),
        isPending,
        id,
        timestamp: Date.now(),
        changeCount: changeCountRef.current,
        touched: form.formState.isDirty,
      }

      debounced(values as T, metadata)
    })

    return () => subscription.unsubscribe()
  }, [form, onStateChange, debounceMs, id, isPending])
}

/**
 * Form action button descriptor (built from actionsConfig)
 */
interface FormActionButton {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  visible: boolean
  enabled: boolean
  loading: boolean
  position: string
  variant?: ButtonVariant
  type?: 'button' | 'submit' | 'reset'
}

/**
 * Hook: useFormActions
 * Processes actionsConfig and returns button handlers
 */
function useFormActions<T extends Record<string, unknown>>(
  config: BaseFormActionsConfig<T> | undefined,
  form: UseFormReturn<FieldValues>,
  metadata: FormMetadata,
  onSubmit?: (values: T, metadata: FormMetadata) => void | Promise<void>
): {
  handlers: Record<string, () => void | Promise<void>>
  buttons: FormActionButton[]
} {
  const t = useTelamonjsT()
  const handlers: Record<string, () => void | Promise<void>> = {}
  const buttons: FormActionButton[] = []

  if (!config) {
    return { handlers, buttons }
  }

  const values = form.getValues() as T

  // Standard buttons
  if (config.standard?.submit) {
    const submitConfig =
      typeof config.standard.submit === 'boolean' ? {} : config.standard.submit

    buttons.push({
      id: 'submit',
      label: submitConfig.label || t('common.save'),
      icon: submitConfig.icon || Save,
      visible:
        typeof submitConfig.visible === 'function'
          ? submitConfig.visible(values, metadata)
          : submitConfig.visible !== false,
      enabled:
        typeof submitConfig.enabled === 'function'
          ? submitConfig.enabled(values, metadata)
          : submitConfig.enabled !== false,
      loading:
        typeof submitConfig.loading === 'function'
          ? submitConfig.loading(values, metadata)
          : submitConfig.loading || false,
      position: 'right',
      variant: submitConfig.variant || 'default',
      type: submitConfig.type || 'button',
    })

    handlers.submit = async () => {
      // Validates via RHF/Zod (`validation` prop) before submitting — on error,
      // populates formState.errors and does not call the handler. Also ensures
      // current values (the ones captured at render time may be stale).
      await form.handleSubmit(async currentValues => {
        if (submitConfig.onClick) {
          await submitConfig.onClick(currentValues as T, metadata)
        } else if (onSubmit) {
          await onSubmit(currentValues as T, metadata)
        }
      })()
    }
  }

  if (config.standard?.cancel) {
    const cancelConfig =
      typeof config.standard.cancel === 'boolean' ? {} : config.standard.cancel

    buttons.push({
      id: 'cancel',
      label: cancelConfig.label || t('common.cancel'),
      icon: cancelConfig.icon || X,
      visible:
        typeof cancelConfig.visible === 'function'
          ? cancelConfig.visible(values, metadata)
          : cancelConfig.visible !== false,
      enabled:
        typeof cancelConfig.enabled === 'function'
          ? cancelConfig.enabled(values, metadata)
          : cancelConfig.enabled !== false,
      loading: false,
      position: 'left',
      variant: cancelConfig.variant || 'outline',
      type: cancelConfig.type || 'button',
    })

    handlers.cancel = async () => {
      if (cancelConfig.onClick) {
        await cancelConfig.onClick(values, metadata)
      }
    }
  }

  // Custom buttons
  if (config.custom) {
    config.custom.forEach(customAction => {
      buttons.push({
        id: customAction.id,
        label: customAction.label || customAction.id,
        icon: customAction.icon,
        visible:
          typeof customAction.visible === 'function'
            ? customAction.visible(values, metadata)
            : customAction.visible !== false,
        enabled:
          typeof customAction.enabled === 'function'
            ? customAction.enabled(values, metadata)
            : customAction.enabled !== false,
        loading:
          typeof customAction.loading === 'function'
            ? customAction.loading(values, metadata)
            : customAction.loading || false,
        position: customAction.position || 'right',
        variant: customAction.variant || 'default',
        type: customAction.type || 'button',
      })

      handlers[customAction.id] = async () => {
        if (customAction.onClick) {
          await customAction.onClick(values, metadata)
        }
      }
    })
  }

  return { handlers, buttons }
}

// ============================================================================
// MEMOIZED FIELD RENDERER COMPONENT
// ============================================================================

interface FieldRendererProps {
  field: ResolvedFormField
  form: UseFormReturn<FieldValues>
  id?: string
}

const FieldRenderer = memo<FieldRendererProps>(({ field, form, id }) => {
  const t = useTelamonjsT()
  const dateFnsLocale = useDateFnsLocale()
  const renderer = getFieldRenderer(field.type)

  if (!renderer) {
    return (
      <div key={field.name}>
        <p className='text-sm text-red-500'>
          Field type "{field.type}" not found in registry
        </p>
      </div>
    )
  }

  return (
    <div
      key={field.name}
      className={cn('space-y-2', field.span && `col-span-${field.span}`)}
    >
      <Controller
        name={field.name}
        control={form.control}
        render={({ field: controllerField, fieldState }) => {
          // fieldState (not form.formState, read outside the Controller) keeps
          // the ARIA state current: this component is memoized and doesn't
          // re-render when validation errors change.
          const hasError = !!fieldState.error
          return (
            <>
              {renderer.render({
                field: {
                  ...field,
                  id: field.name,
                  name: field.name,
                  value: controllerField.value,
                  onChange: (newValue: unknown) => {
                    controllerField.onChange(newValue)
                  },
                  onBlur: controllerField.onBlur,
                  // Lets a failed submit focus the field
                  ref: controllerField.ref,
                  error: fieldState.error?.message,
                  // ARIA attributes
                  'aria-invalid': hasError ? 'true' : undefined,
                  'aria-describedby': hasError
                    ? `${field.name}-error`
                    : undefined,
                  'aria-required': field.required ? 'true' : undefined,
                },
                value: controllerField.value,
                id: id,
                t,
                dateFnsLocale,
              })}
              {hasError && (
                <span
                  id={`${field.name}-error`}
                  className='sr-only'
                  role='alert'
                >
                  {fieldState.error?.message}
                </span>
              )}
            </>
          )
        }}
      />
    </div>
  )
})
FieldRenderer.displayName = 'FieldRenderer'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * BaseForm - Foundation form component with state observation
 *
 * @template T - Entity/Form data type
 *
 * Responsibilities:
 * - Render fields with RHF + Zod validation
 * - Call onStateChange on value updates (debounced)
 * - Provide optional onSubmit for form submission
 * - Execute custom actions via actionsConfig buttons
 */
export function BaseForm<T extends Record<string, unknown>>({
  fields,
  sections,
  validation,
  initialValues,
  id,
  onStateChange,
  onStateChangeDebounce = 300,
  onSubmit,
  actionsConfig,
  grid = '2',
  useTabs,
  hideDefaultButtons,
  className,
}: BaseFormProps<T>): React.ReactElement {
  const t = useTelamonjsT()
  const text = useText()
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [isPending] = useTransition()

  // Setup React Hook Form
  // Note: zodResolver v5 expects `_def.typeName` (Zod3Type), which every concrete
  // zod 3 schema carries at runtime but the base `z.ZodType` type does not declare.
  const form = useForm<FieldValues>({
    resolver: validation
      ? zodResolver(
          validation as typeof validation & { _def: { typeName: string } }
        )
      : undefined,
    defaultValues: initialValues || {},
  })

  // Date.now() is impure and can't be called during render. metadata.timestamp
  // only needs to identify "this form instance's session" for consumers
  // (changeCount below is likewise a fixed placeholder, not tracked
  // per-change), so capture it once, lazily, at mount.
  const [metadataTimestamp] = useState(() => Date.now())

  // Build form metadata
  const metadata: FormMetadata = useMemo(
    () => ({
      isValid: form.formState.isValid,
      errors: Object.entries(form.formState.errors).reduce(
        (acc, [key, error]) => {
          acc[key] = [error?.message as string]
          return acc
        },
        {} as Record<string, string[]>
      ),
      isPending,
      id,
      timestamp: metadataTimestamp,
      changeCount: 0,
      touched: form.formState.isDirty,
    }),
    [form.formState, id, isPending, metadataTimestamp]
  )

  // Use state observer hook
  useFormStateObserver<T>(form, onStateChange, onStateChangeDebounce, id)

  // Use actions hook
  const { handlers, buttons } = useFormActions<T>(
    hideDefaultButtons ? undefined : actionsConfig,
    form,
    metadata,
    onSubmit
  )

  // Get sections from fields or sections prop — I18nText label/placeholder/
  // description slots are resolved once here; everything downstream (field
  // renderers, section headings) keeps receiving plain strings.
  const formSections = useMemo(() => {
    const raw: FormSection[] = sections
      ? [...sections]
      : fields
        ? [{ label: '', fields: [...fields] }]
        : []
    return resolveFormSections(raw, text) ?? []
  }, [sections, fields, text])

  // Filter editOnly fields if no ID (create mode)
  const filteredSections = useMemo(() => {
    if (id) return formSections
    return formSections.map(section => {
      const currentSection = section
      const sectionFields = currentSection.fields
      return {
        ...currentSection,
        fields:
          Array.isArray(sectionFields) && Array.isArray(sectionFields[0])
            ? (sectionFields as ResolvedFormField[][]).map(row =>
                row.filter(field => !field.editOnly)
              )
            : (sectionFields as ResolvedFormField[]).filter(
                field => !field.editOnly
              ),
      }
    })
  }, [formSections, id])

  // Current section for tabs
  const currentSection = filteredSections[currentSectionIndex] as
    | ResolvedFormSection
    | undefined

  // Render field function memoized
  const renderField = useCallback(
    (field: ResolvedFormField) => {
      return (
        <FieldRenderer key={field.name} field={field} form={form} id={id} />
      )
    },
    [form, id]
  )

  // Render buttons
  const renderButtons = useCallback(() => {
    if (hideDefaultButtons || !buttons.length) return null

    const leftButtons = buttons.filter(b => b.position === 'left' && b.visible)
    const rightButtons = buttons.filter(
      b => b.position === 'right' && b.visible
    )

    return (
      <div className='flex items-center justify-between gap-4 pt-6'>
        <div className='flex gap-2'>
          {leftButtons.map(button => {
            const Icon = button.icon
            return (
              <Button
                key={button.id}
                type={button.type}
                variant={button.variant}
                onClick={() => handlers[button.id]?.()}
                disabled={!button.enabled || button.loading}
                aria-label={button.label}
              >
                {button.loading ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : Icon ? (
                  <Icon className='mr-2 h-4 w-4' />
                ) : null}
                {button.label}
              </Button>
            )
          })}
        </div>
        <div className='flex gap-2'>
          {rightButtons.map(button => {
            const Icon = button.icon
            return (
              <Button
                key={button.id}
                type={button.type}
                variant={button.variant}
                onClick={() => handlers[button.id]?.()}
                disabled={!button.enabled || button.loading}
                aria-label={button.label}
              >
                {button.loading ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : Icon ? (
                  <Icon className='mr-2 h-4 w-4' />
                ) : null}
                {button.label}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }, [buttons, handlers, hideDefaultButtons])

  // Convert RHF errors to ValidationError format
  const validationErrors = useMemo(
    () =>
      Object.entries(form.formState.errors).map(([field, error]) => ({
        field,
        message:
          (error as FieldError | undefined)?.message || t('form.invalidField'),
      })),
    [form.formState.errors, t]
  )

  return (
    <FormProvider {...form}>
      <form className={cn('space-y-6', className)} noValidate>
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <ValidationErrors errors={validationErrors} />
        )}

        {/* Tabs (if useTabs) */}
        {useTabs && filteredSections.length > 1 && (
          <div className='flex border-b' role='tablist'>
            {filteredSections.map((section, sectionIdx) => {
              const currentSection = section as ResolvedFormSection
              const Icon = currentSection.icon
              const isSelected = currentSectionIndex === sectionIdx
              return (
                <button
                  key={currentSection.label || `section-${sectionIdx}`}
                  type='button'
                  role='tab'
                  aria-selected={isSelected}
                  aria-controls={`tabpanel-${sectionIdx}`}
                  id={`tab-${sectionIdx}`}
                  data-testid={`form-section-tab-${sectionIdx}`}
                  onClick={() => setCurrentSectionIndex(sectionIdx)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                    isSelected
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {Icon}
                  {currentSection.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Sections */}
        {useTabs ? (
          <div
            className='space-y-6'
            role='tabpanel'
            id={`tabpanel-${currentSectionIndex}`}
            aria-labelledby={`tab-${currentSectionIndex}`}
          >
            {currentSection && (
              <>
                {currentSection.description && (
                  <p className='text-sm text-muted-foreground'>
                    {currentSection.description}
                  </p>
                )}
                <div
                  className={cn(
                    'grid gap-4',
                    `grid-cols-${currentSection.grid || grid}`
                  )}
                  role='group'
                  aria-label={currentSection.label || undefined}
                >
                  {Array.isArray(currentSection.fields) &&
                  Array.isArray(currentSection.fields[0])
                    ? (currentSection.fields as ResolvedFormField[][]).map(
                        (row, rowIndex) => (
                          <div
                            key={rowIndex}
                            className='col-span-full grid gap-4'
                          >
                            {row.map(renderField)}
                          </div>
                        )
                      )
                    : (
                        (currentSection.fields || []) as ResolvedFormField[]
                      ).map(renderField)}
                </div>
              </>
            )}
          </div>
        ) : (
          filteredSections.map((section, sectionIndex) => {
            const currentSection = section as ResolvedFormSection
            const sectionFields = currentSection.fields || []
            const Icon = currentSection.icon
            return (
              <div key={sectionIndex} className='space-y-4'>
                {currentSection.label && (
                  <div className='flex items-center gap-2'>
                    {Icon}
                    <h3 className='text-lg font-semibold'>
                      {currentSection.label}
                    </h3>
                  </div>
                )}
                {currentSection.description && (
                  <p className='text-sm text-muted-foreground'>
                    {currentSection.description}
                  </p>
                )}
                <div
                  className={cn(
                    'grid gap-4',
                    `grid-cols-${currentSection.grid || grid}`
                  )}
                  role='group'
                  aria-label={currentSection.label || undefined}
                >
                  {Array.isArray(sectionFields) &&
                  Array.isArray(sectionFields[0])
                    ? (sectionFields as ResolvedFormField[][]).map(
                        (row, rowIndex) => (
                          <div
                            key={rowIndex}
                            className='col-span-full grid gap-4'
                          >
                            {row.map(renderField)}
                          </div>
                        )
                      )
                    : (sectionFields as ResolvedFormField[]).map(renderField)}
                </div>
              </div>
            )
          })
        )}

        {/* Action Buttons */}
        {renderButtons()}

        {/* Tab Navigation */}
        {useTabs && filteredSections.length > 1 && (
          <div className='flex items-center justify-between pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                setCurrentSectionIndex(prev => Math.max(0, prev - 1))
              }
              disabled={currentSectionIndex === 0}
              aria-label={t('common.previous')}
            >
              <ChevronLeft className='mr-2 h-4 w-4' />
              {t('common.previous')}
            </Button>
            <span className='text-sm text-muted-foreground' role='status'>
              {t('form.stepOf', {
                step: currentSectionIndex + 1,
                total: filteredSections.length,
              })}
            </span>
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                setCurrentSectionIndex(prev =>
                  Math.min(filteredSections.length - 1, prev + 1)
                )
              }
              disabled={currentSectionIndex === filteredSections.length - 1}
              aria-label={t('common.next')}
            >
              {t('common.next')}
              <ChevronRight className='ml-2 h-4 w-4' />
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
