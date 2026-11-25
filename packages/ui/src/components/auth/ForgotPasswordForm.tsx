'use client'

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTelamonjsT } from '../../i18n/use-t'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { cn } from '../../utils'
import { FieldError } from './FieldError'

export interface ForgotPasswordFormProps {
  /**
   * Sends the reset email (the app's API call). Resolve whether or not the
   * account exists; a rejection shows a generic, localized error.
   */
  onSubmit: (email: string) => Promise<void>
  /** Renders a "Back to sign in" link, in the form and in the success state. */
  signInHref?: string
  className?: string
}

/**
 * ForgotPasswordForm - asks for an email and hands it to `onSubmit`.
 *
 * The success message never reveals whether the account exists, and a failure
 * never shows the backend's text, so the form cannot be used to probe accounts.
 *
 * @example
 * ```tsx
 * <ForgotPasswordForm onSubmit={(email) => authApi.requestPasswordReset(email)} signInHref="/sign-in" />
 * ```
 */
export function ForgotPasswordForm({ onSubmit, signInHref, className }: ForgotPasswordFormProps) {
  const t = useTelamonjsT()
  const id = useId()
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .email(t('validation.invalidEmail')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  const submit = handleSubmit(async ({ email }) => {
    setFailed(false)
    try {
      await onSubmit(email)
      setSent(true)
    } catch {
      setFailed(true)
    }
  })

  const backLink = signInHref && (
    <p className='text-center text-sm'>
      <Link href={signInHref} className='text-muted-foreground hover:text-foreground hover:underline'>
        {t('auth.backToSignIn')}
      </Link>
    </p>
  )

  if (sent) {
    return (
      <div className={cn('space-y-4 text-center', className)}>
        <p role='status' className='text-sm'>
          {t('auth.forgotSent')}
        </p>
        {backLink}
      </div>
    )
  }

  const emailId = `${id}-email`

  return (
    <form onSubmit={submit} noValidate className={cn('space-y-4', className)}>
      {failed && (
        <div role='alert' className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
          {t('auth.forgotError')}
        </div>
      )}

      <div className='space-y-2'>
        <Label htmlFor={emailId}>{t('auth.identifierLabel')}</Label>
        <Input
          id={emailId}
          type='email'
          autoComplete='email'
          autoCapitalize='none'
          spellCheck={false}
          disabled={isSubmitting}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          {...register('email')}
        />
        <FieldError id={`${emailId}-error`} message={errors.email?.message} />
      </div>

      <Button type='submit' className='w-full' loading={isSubmitting} data-testid='forgot-password-submit'>
        {isSubmitting ? t('auth.forgotSending') : t('auth.forgotSubmit')}
      </Button>

      {backLink}
    </form>
  )
}
