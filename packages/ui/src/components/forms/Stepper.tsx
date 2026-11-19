'use client'

import { cn } from '../../utils'
import { Check } from 'lucide-react'

export interface StepConfig {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  status: 'pending' | 'current' | 'completed' | 'error'
}

export interface StepperProps {
  steps: StepConfig[]
  currentStep: number
  onStepClick?: (step: number) => void
  orientation?: 'horizontal' | 'vertical'
  allowSkip?: boolean
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  orientation = 'horizontal',
  allowSkip = false,
}: StepperProps) {
  const handleStepClick = (index: number) => {
    if (!onStepClick) return

    const step = steps[index]
    if (step.status === 'completed' || allowSkip) {
      onStepClick(index)
    }
  }

  if (orientation === 'vertical') {
    return (
      <div className='space-y-4'>
        {steps.map((step, index) => {
          const isClickable =
            onStepClick && (step.status === 'completed' || allowSkip)

          return (
            <div key={step.id} className='relative'>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-5 top-12 w-0.5 h-full',
                    step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}

              <button
                type='button'
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                data-testid={`stepper-step-${step.id}`}
                className={cn(
                  'flex items-start gap-4 w-full text-left p-4 rounded-lg transition-all',
                  isClickable && 'hover:bg-muted/50 cursor-pointer',
                  !isClickable && 'cursor-not-allowed',
                  step.status === 'current' &&
                    'bg-blue-50 dark:bg-blue-950/30 border border-blue-200'
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 flex-shrink-0 transition-all',
                    step.status === 'completed' &&
                      'bg-green-500 border-green-500 text-white',
                    step.status === 'current' &&
                      'bg-blue-500 border-blue-500 text-white',
                    step.status === 'error' &&
                      'bg-red-500 border-red-500 text-white',
                    step.status === 'pending' &&
                      'bg-card border-border text-muted-foreground'
                  )}
                >
                  {step.status === 'completed' ? (
                    <Check className='w-5 h-5' />
                  ) : step.icon ? (
                    <span className='w-5 h-5'>{step.icon}</span>
                  ) : (
                    <span className='text-sm font-semibold'>{index + 1}</span>
                  )}
                </div>

                {/* Step content */}
                <div className='flex-1 min-w-0'>
                  <div
                    className={cn(
                      'text-sm font-medium',
                      step.status === 'current' &&
                        'text-blue-700 dark:text-blue-300',
                      step.status === 'completed' &&
                        'text-green-700 dark:text-green-300',
                      step.status === 'error' &&
                        'text-red-700 dark:text-red-300',
                      step.status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className='text-xs text-muted-foreground mt-1'>
                      {step.description}
                    </div>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal orientation
  return (
    <div className='w-full'>
      <div className='flex items-center justify-between'>
        {steps.map((step, index) => {
          const isClickable =
            onStepClick && (step.status === 'completed' || allowSkip)

          return (
            <div
              key={step.id}
              className='flex items-center flex-1 last:flex-initial'
            >
              <button
                type='button'
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                data-testid={`stepper-step-${step.id}`}
                className={cn(
                  'flex flex-col items-center gap-2 relative',
                  isClickable && 'cursor-pointer hover:opacity-80',
                  !isClickable && 'cursor-not-allowed'
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    step.status === 'completed' &&
                      'bg-green-500 border-green-500 text-white',
                    step.status === 'current' &&
                      'bg-blue-500 border-blue-500 text-white',
                    step.status === 'error' &&
                      'bg-red-500 border-red-500 text-white',
                    step.status === 'pending' &&
                      'bg-card border-border text-muted-foreground'
                  )}
                >
                  {step.status === 'completed' ? (
                    <Check className='w-5 h-5' />
                  ) : step.icon ? (
                    <span className='w-5 h-5'>{step.icon}</span>
                  ) : (
                    <span className='text-sm font-semibold'>{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <div className='text-center'>
                  <div
                    className={cn(
                      'text-xs font-medium',
                      step.status === 'current' &&
                        'text-blue-700 dark:text-blue-300',
                      step.status === 'completed' &&
                        'text-green-700 dark:text-green-300',
                      step.status === 'error' &&
                        'text-red-700 dark:text-red-300',
                      step.status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className='text-xs text-muted-foreground mt-0.5 max-w-[120px]'>
                      {step.description}
                    </div>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2',
                    step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className='mt-4 w-full bg-gray-200 rounded-full h-1'>
        <div
          className='bg-blue-500 h-1 rounded-full transition-all duration-300'
          style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
