'use client'

import React from 'react'
import { cn } from '../../utils'
import { Check } from 'lucide-react'

/**
 * Progress step
 */
export interface ProgressStep {
  label: string
  status: 'completed' | 'current' | 'pending'
  description?: string
}

/**
 * ProgressTracker props
 */
export interface ProgressTrackerProps {
  steps: ProgressStep[]
  variant?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * ProgressTracker - Multi-step progress tracker
 *
 * @example
 * ```tsx
 * <ProgressTracker
 *   steps={[
 *     { label: 'Information', status: 'completed' },
 *     { label: 'Payment', status: 'current' },
 *     { label: 'Confirmation', status: 'pending' }
 *   ]}
 * />
 * ```
 */
export function ProgressTracker({
  steps,
  variant = 'horizontal',
  className,
}: ProgressTrackerProps) {
  if (variant === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, stepIdx) => (
          <div key={step.label} className='flex gap-4'>
            <div className='flex flex-col items-center'>
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                  step.status === 'completed' &&
                    'bg-primary text-primary-foreground',
                  step.status === 'current' &&
                    'bg-primary/20 text-primary border-2 border-primary',
                  step.status === 'pending' && 'bg-muted text-muted-foreground'
                )}
              >
                {step.status === 'completed' ? (
                  <Check className='w-5 h-5' />
                ) : (
                  <span>{stepIdx + 1}</span>
                )}
              </div>
              {stepIdx < steps.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-16 mt-2',
                    steps[stepIdx + 1].status === 'completed' ||
                      steps[stepIdx + 1].status === 'current'
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                />
              )}
            </div>
            <div className='flex-1 pt-1'>
              <h4
                className={cn(
                  'font-semibold',
                  step.status === 'current' && 'text-primary',
                  step.status === 'pending' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </h4>
              {step.description && (
                <p className='text-sm text-muted-foreground mt-1'>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className='flex items-center justify-between'>
        {steps.map((step, stepIdx) => (
          <React.Fragment key={step.label}>
            <div className='flex flex-col items-center flex-1'>
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                  step.status === 'completed' &&
                    'bg-primary text-primary-foreground',
                  step.status === 'current' &&
                    'bg-primary/20 text-primary border-2 border-primary',
                  step.status === 'pending' && 'bg-muted text-muted-foreground'
                )}
              >
                {step.status === 'completed' ? (
                  <Check className='w-5 h-5' />
                ) : (
                  <span>{stepIdx + 1}</span>
                )}
              </div>
              <div className='mt-2 text-center'>
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.status === 'current' && 'text-primary',
                    step.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {stepIdx < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 -mt-8',
                  steps[stepIdx + 1].status === 'completed' ||
                    steps[stepIdx + 1].status === 'current'
                    ? 'bg-primary'
                    : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
