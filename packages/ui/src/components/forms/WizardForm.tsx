'use client'

import { useState, useTransition, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, FormProvider } from 'react-hook-form'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { cn } from '../../utils'
import { colSpanClass, gridColsClass } from './grid-classes'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Stepper, StepConfig } from './Stepper'
import { ReviewStep, WizardStep } from './ReviewStep'
import { useFormDraft } from '../../hooks/useFormDraft'
import {
  AdminFormRenderer,
  type AdminFormRendererProps,
} from './AdminFormRenderer'
import type { FormField, FormSection } from '../../types/forms/admin-form'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { useFormat } from '../../i18n/use-format'

export interface WizardFormProps<T extends Record<string, unknown>> {
  steps: WizardStep[]
  onSubmit: (data: T) => Promise<void>
  onStepChange?: (currentStep: number) => void
  draftKey?: string
  showReview?: boolean
  orientation?: 'horizontal' | 'vertical'
  initialData?: Partial<T>
  /** Passed through to the review step — see `ReviewStepProps.formatValue`. */
  formatValue?: (fieldName: string, value: unknown) => React.ReactNode
}

/**
 * Renders one step's fields against the WIZARD's own `control`/`setValue`
 * (never a nested `useForm`) via `AdminFormRenderer` — the field-registry
 * renderer for a single controlled field, exported by the lib for exactly
 * this: consuming field types outside of `AdminForm`'s own form instance.
 * Layout mirrors AdminForm's field-group (grid + Label + inline error).
 */
function WizardStepFields({
  fields,
  grid,
  form,
}: {
  fields: FormField[] | FormField[][]
  grid: string
  form: ReturnType<typeof useForm>
}) {
  const text = useText()
  const flatFields = Array.isArray(fields[0])
    ? (fields as FormField[][]).flat()
    : (fields as FormField[])

  return (
    <div className={cn('grid gap-4', gridColsClass(grid))} role='group'>
      {flatFields.map(field => {
        const error = form.formState.errors[field.name] as
          | { message?: string }
          | undefined

        return (
          <div
            key={field.name}
            className={cn('space-y-2', field.span && colSpanClass(field.span))}
          >
            {field.type !== 'space' && (
              <Label htmlFor={field.name}>
                {text(field.label)}{' '}
                {field.required && <span className='text-red-500 ml-1'>*</span>}
              </Label>
            )}
            <AdminFormRenderer
              // The resolver's inferred `Control<FieldValues, unknown, unknown>`
              // doesn't structurally match `AdminFormRendererProps.control`'s
              // `Control<FieldValues>` (extra RHF v7 generic params) — same
              // shape at runtime, cast at the boundary like every other
              // AdminFormRenderer consumer outside AdminForm's own form.
              {...({
                field,
                control: form.control,
                setValue: form.setValue,
                form,
              } as unknown as AdminFormRendererProps)}
            />
            {error?.message && (
              <p className='text-sm text-red-500 mt-1' role='alert'>
                {error.message}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function WizardForm<T extends Record<string, unknown>>({
  steps,
  onSubmit,
  onStepChange,
  draftKey,
  showReview = true,
  orientation = 'horizontal',
  initialData,
  formatValue,
}: WizardFormProps<T>) {
  // react-hook-form's form.watch() returns a subscription API the compiler
  // can't safely memoize (documented incompatible-library case).
  'use no memo'

  const t = useTelamonjsT()
  const text = useText()
  const { time: formatTime } = useFormat()
  const [currentStep, setCurrentStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Draft management
  const {
    draft,
    updateDraft,
    clearDraft,
    hasDraft: checkHasDraft,
    lastSaved,
  } = useFormDraft<T>(draftKey || 'wizard-form', initialData)

  // Show toast if draft exists on mount (once per draftKey; `checkHasDraft`
  // and `t` are intentionally read from the first render of each key).
  useEffect(() => {
    if (draftKey && checkHasDraft()) {
      toast.info(t('form.draftRestored.title'), {
        description: t('form.draftRestored.description'),
        duration: 5000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per draftKey, not on every identity change
  }, [draftKey])

  const currentStepConfig = steps[currentStep]
  const isReviewStep = showReview && currentStep === steps.length
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  // Form for current step
  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: draft as any,
    resolver: currentStepConfig?.validation
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (zodResolver as any)(currentStepConfig.validation)
      : undefined,
  })

  // Update draft when form values change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- form.watch() returns a subscription the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it.
    const subscription = form.watch(values => {
      updateDraft(values as Partial<T>)
    })
    return () => subscription.unsubscribe()
  }, [form, updateDraft])

  // Call onStepChange when step changes
  useEffect(() => {
    onStepChange?.(currentStep)
  }, [currentStep, onStepChange])

  const validateCurrentStep = async (): Promise<boolean> => {
    if (isReviewStep) return true

    const isValid = await form.trigger()
    return isValid
  }

  // Wrapped in startTransition (shared `isPending` with submit) because
  // `onExit` may be async (e.g. persist the step before advancing) — the
  // Back/Next/Submit buttons all disable while it resolves.
  const handleNext = () => {
    startTransition(async () => {
      const isValid = await validateCurrentStep()

      if (!isValid) {
        toast.error(t('form.fillRequiredFields'))
        return
      }

      // Execute onExit if defined — may be sync or async
      const formData = form.getValues()
      if (currentStepConfig.onExit) {
        const canProceed = await currentStepConfig.onExit(formData)
        if (canProceed === false) {
          return
        }
      }

      // Mark step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]))

      // Move to next step
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)

      // Execute onEnter for next step
      if (nextStep < steps.length) {
        const nextStepConfig = steps[nextStep]
        nextStepConfig.onEnter?.(formData)
      }
    })
  }

  const handleBack = () => {
    if (isFirstStep) return
    setCurrentStep(currentStep - 1)
  }

  const handleStepClick = (stepIndex: number) => {
    // Can navigate to completed steps or current step
    if (completedSteps.has(stepIndex) || stepIndex === currentStep) {
      setCurrentStep(stepIndex)
    }
  }

  const handleSubmit = async () => {
    startTransition(async () => {
      try {
        const formData = form.getValues() as T
        await onSubmit(formData)
        clearDraft()
        toast.success(t('form.submitSuccess'))
      } catch (error) {
        logger.error('Error submitting wizard', {
          error: error instanceof Error ? error : String(error),
        })
        toast.error(t('form.submitError'))
      }
    })
  }

  // Generate stepper config
  const stepperConfig: StepConfig[] = [
    ...steps.map((step, index) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      icon: step.icon,
      status: (completedSteps.has(index)
        ? 'completed'
        : index === currentStep
          ? 'current'
          : 'pending') as 'pending' | 'current' | 'completed' | 'error',
    })),
    ...(showReview
      ? [
          {
            id: 'review',
            title: t('form.reviewTitle'),
            description: t('form.reviewDescription'),
            icon: <CheckCircle2 className='w-5 h-5' />,
            status: (currentStep === steps.length ? 'current' : 'pending') as
              | 'pending'
              | 'current'
              | 'completed'
              | 'error',
          },
        ]
      : []),
  ]

  return (
    <div className='w-full space-y-8'>
      {/* Stepper */}
      <div className='bg-card p-6 rounded-lg shadow-sm border border-border'>
        <Stepper
          steps={stepperConfig}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          orientation={orientation}
          allowSkip={false}
        />
      </div>

      {/* Step content */}
      <div className='bg-card p-8 rounded-lg shadow-sm border border-border'>
        {isReviewStep ? (
          <ReviewStep
            data={form.getValues()}
            steps={steps}
            onEdit={stepIndex => setCurrentStep(stepIndex)}
            formatValue={formatValue}
          />
        ) : (
          <div className='space-y-6'>
            {/* Step header */}
            <div className='mb-6'>
              <div className='flex items-center gap-3 mb-2'>
                {currentStepConfig.icon && (
                  <div className='text-blue-600 dark:text-blue-300'>
                    {currentStepConfig.icon}
                  </div>
                )}
                <h2 className='text-2xl font-bold text-foreground'>
                  {currentStepConfig.title}
                </h2>
              </div>
              {currentStepConfig.description && (
                <p className='text-sm text-muted-foreground'>
                  {currentStepConfig.description}
                </p>
              )}
            </div>

            {/* Step form fields — rendered against THIS wizard's own
                control/setValue via AdminFormRenderer. FormProvider is kept
                only because file/image field types read useFormContext(). */}
            <FormProvider {...form}>
              <form className='space-y-6'>
                {currentStepConfig.sections.map((section: FormSection, idx) => (
                  <div key={idx} className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      {section.icon && (
                        <span className='text-muted-foreground'>
                          {section.icon}
                        </span>
                      )}
                      <h3 className='text-lg font-semibold text-foreground'>
                        {text(section.label)}
                      </h3>
                    </div>
                    {section.description && (
                      <p className='text-sm text-muted-foreground mb-4'>
                        {text(section.description)}
                      </p>
                    )}
                    <WizardStepFields
                      fields={section.fields}
                      grid={section.grid || '2'}
                      form={form}
                    />
                  </div>
                ))}
              </form>
            </FormProvider>
          </div>
        )}

        {/* Draft save indicator */}
        {draftKey && lastSaved && (
          <div className='mt-4 text-xs text-muted-foreground flex items-center gap-2'>
            <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
            {t('form.draftSavedAt', { time: formatTime(lastSaved) })}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className='flex items-center justify-between'>
        <Button
          type='button'
          variant='outline'
          onClick={handleBack}
          disabled={isFirstStep || isPending}
          data-testid='wizard-back-button'
          className={cn('gap-2', isFirstStep && 'invisible')}
        >
          <ChevronLeft className='w-4 h-4' />
          {t('common.previous')}
        </Button>

        <div className='flex items-center gap-3'>
          {draftKey && (
            <Button
              type='button'
              variant='ghost'
              onClick={clearDraft}
              disabled={isPending}
              data-testid='wizard-discard-draft-button'
              className='text-muted-foreground hover:text-foreground'
            >
              {t('form.discardDraft')}
            </Button>
          )}

          {isReviewStep ? (
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={isPending}
              data-testid='wizard-submit-button'
              className='gap-2'
            >
              {isPending ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  {t('form.sending')}
                </>
              ) : (
                <>
                  <CheckCircle2 className='w-4 h-4' />
                  {t('form.confirmAndSubmit')}
                </>
              )}
            </Button>
          ) : (
            <Button
              type='button'
              onClick={handleNext}
              disabled={isPending}
              data-testid='wizard-next-button'
              className='gap-2'
            >
              {isLastStep && !showReview ? (
                <>
                  <CheckCircle2 className='w-4 h-4' />
                  {t('form.finish')}
                </>
              ) : (
                <>
                  {t('common.next')}
                  <ChevronRight className='w-4 h-4' />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export type { WizardStep }
