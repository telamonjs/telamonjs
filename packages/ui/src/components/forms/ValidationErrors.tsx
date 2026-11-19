'use client'

import { AlertCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTelamonjsT } from '../../i18n/use-t'

export interface ValidationError {
  field: string
  message: string
}

interface ValidationErrorsProps {
  error?: string | null
  errors?: ValidationError[]
  className?: string
}

function parseErrorString(
  errorString: string,
  t: ReturnType<typeof useTelamonjsT>
): ValidationError[] {
  const errors: ValidationError[] = []

  // Check if it's a formatted validation error. These prefixes are a
  // wire-format contract with server error strings, not UI copy.
  if (
    errorString.includes('Campos obrigatórios:') || // i18n-ignore
    errorString.includes('Erro:') // i18n-ignore
  ) {
    // Remove the prefix
    const cleanError = errorString
      .replace('Erro: Campos obrigatórios:', '') // i18n-ignore
      .replace('Campos obrigatórios:', '') // i18n-ignore
      .replace('Erro:', '') // i18n-ignore
      .trim()

    // Split by both semicolon and comma for multiple errors
    const errorParts = cleanError
      .split(/[;,]/)
      .map(e => e.trim())
      .filter(e => e)

    errorParts.forEach(part => {
      // Split by colon to separate field from message
      const colonIndex = part.indexOf(':')
      if (colonIndex > -1) {
        const field = part.substring(0, colonIndex).trim()
        const message = part.substring(colonIndex + 1).trim()
        errors.push({ field, message })
      } else if (part) {
        // If no colon, treat as field name with generic message
        errors.push({ field: part, message: t('validation.required') })
      }
    })
  } else {
    // Single error message
    errors.push({ field: '', message: errorString })
  }

  return errors
}

function computeErrorState(
  error: string | null | undefined,
  errors: ValidationError[] | undefined,
  t: ReturnType<typeof useTelamonjsT>
): { visible: boolean; list: ValidationError[] } {
  if (error) {
    return { visible: true, list: parseErrorString(error, t) }
  }
  if (errors && errors.length > 0) {
    return { visible: true, list: errors }
  }
  return { visible: false, list: [] }
}

export function ValidationErrors({
  error,
  errors,
  className = '',
}: ValidationErrorsProps) {
  const t = useTelamonjsT()
  const [isVisible, setIsVisible] = useState(
    () => computeErrorState(error, errors, t).visible
  )
  const [errorList, setErrorList] = useState<ValidationError[]>(
    () => computeErrorState(error, errors, t).list
  )
  // Recompute when error/errors change (React "adjusting state when a prop
  // changes" pattern — avoids an extra effect + render). handleClose below
  // can still independently dismiss isVisible without these props changing.
  const [prevError, setPrevError] = useState(error)
  const [prevErrors, setPrevErrors] = useState(errors)
  if (error !== prevError || errors !== prevErrors) {
    setPrevError(error)
    setPrevErrors(errors)
    const next = computeErrorState(error, errors, t)
    setIsVisible(next.visible)
    setErrorList(next.list)
  }

  if (!isVisible || errorList.length === 0) return null

  const handleClose = () => {
    setIsVisible(false)
  }

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}
    >
      <div className='flex items-start'>
        <div className='flex-shrink-0'>
          <AlertCircle className='h-5 w-5 text-red-400' aria-hidden='true' />
        </div>
        <div className='ml-3 flex-1'>
          <h3 className='text-sm font-medium text-red-800'>
            {errorList.length > 1 ? t('form.correctFields') : t('form.attention')}
          </h3>
          <div className='mt-3'>
            {errorList.length === 1 && !errorList[0].field ? (
              <p className='text-sm text-red-700'>{errorList[0].message}</p>
            ) : (
              <div className='space-y-2'>
                {errorList.map((err) => (
                  <div key={err.field || err.message} className='flex items-start gap-2'>
                    <div className='mt-0.5 flex-shrink-0'>
                      <div className='h-1.5 w-1.5 rounded-full bg-red-400' />
                    </div>
                    <div className='text-sm text-red-700'>
                      {err.field ? (
                        <>
                          <span className='font-semibold'>{err.field}:</span>{' '}
                          <span className='text-red-600'>{err.message}</span>
                        </>
                      ) : (
                        <span className='text-red-600'>{err.message}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className='ml-auto pl-3'>
          <div className='-mx-1.5 -my-1.5'>
            <button
              type='button'
              onClick={handleClose}
              aria-label={t('common.close')}
              className='inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50'
            >
              <span className='sr-only'>{t('common.close')}</span>
              <XCircle className='h-5 w-5' aria-hidden='true' />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Alternative compact style for inline field errors
export function FieldError({ error }: { error?: string }) {
  if (!error) return null

  return (
    <div className='mt-1 flex items-center gap-1 text-sm text-red-600'>
      <AlertCircle className='h-3 w-3' />
      <span>{error}</span>
    </div>
  )
}
