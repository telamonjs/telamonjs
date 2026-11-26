'use client'

import { isValidElement, useId, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { cn } from '../../utils'
import { FieldError } from './FieldError'

/** Path + query + hash of `url` when it stays on this origin, else null (no open redirect). */
function sameOriginPath(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, window.location.origin)
    // A path that normalizes to '//host' ('/.//host', '/a/..//host', 'https://app//host')
    // passes the origin check here but reads as protocol-relative in router.push.
    return parsed.origin === window.location.origin && !parsed.pathname.startsWith('//')
      ? parsed.pathname + parsed.search + parsed.hash
      : null
  } catch {
    return null
  }
}

export interface SignInFormValues {
  /** What the user typed in the identifier field, after `normalizeIdentifier`. */
  identifier: string
  password: string
}

/** Outcome of a sign-in attempt; next-auth's `SignInResponse` already fits. */
export type SignInFormResult = { error?: string | null; code?: string | null } | void

export interface SignInFormProps {
  /** Key the identifier is sent under to the credentials provider. Default: `'email'`. */
  identifierName?: string
  /** Default: localized "Email". */
  identifierLabel?: I18nText
  /** `'email'` also validates the format. Default: `'email'`. */
  identifierType?: 'email' | 'text' | 'tel'
  identifierPlaceholder?: I18nText
  passwordPlaceholder?: I18nText
  /** Focuses the identifier field on mount (a sign-in page with nothing else to do). */
  autoFocus?: boolean
  /** Applied to the trimmed identifier before sign-in (e.g. lowercase, strip a CPF mask). */
  normalizeIdentifier?: (value: string) => string
  /**
   * Where to go after signing in when the URL carries no same-origin
   * `?callbackUrl` (which always wins). Default: `'/'`.
   */
  callbackUrl?: string
  /** Renders a "Forgot your password?" link. */
  forgotPasswordHref?: string
  /**
   * Messages per next-auth error, looked up by `code` (the `code` of a custom
   * `CredentialsSignin` subclass) and then by `error`. Unmapped errors get the
   * localized "invalid credentials" (`CredentialsSignin`) or a generic failure.
   * A value may be a React node, e.g. a message with an action link.
   */
  errorMessages?: Record<string, I18nText | ReactNode>
  /**
   * Classes for the error alert, merged over the default (destructive) style;
   * a function receives the error `code` (or `error`) to restyle one case,
   * e.g. a warning-colored notice for an SSO-only account.
   */
  errorClassName?: string | ((code: string | undefined) => string | undefined)
  /**
   * Replaces `signIn('credentials', ...)` for apps that authenticate another
   * way. Resolve `{ error }` to show an error, anything else to succeed.
   */
  onSubmit?: (values: SignInFormValues) => Promise<SignInFormResult>
  /**
   * Replaces `router.push(url)` + `router.refresh()` after a successful
   * sign-in, e.g. a full reload or a role-based home. Receives the resolved url.
   */
  onSuccess?: (url: string) => void | Promise<void>
  className?: string
  /** Classes for the submit button (merged with `w-full`). */
  submitClassName?: string
}

/**
 * SignInForm - credentials sign-in (identifier + password) over next-auth.
 *
 * Validates with zod, shows a password visibility toggle, stays pending until
 * navigation, maps next-auth errors to localized messages and only follows a
 * `?callbackUrl` on the same origin (no open redirect). Branding goes around
 * it: the component renders the form only.
 *
 * @example
 * ```tsx
 * <SignInForm callbackUrl="/admin" forgotPasswordHref="/forgot-password" />
 * ```
 */
export function SignInForm({
  identifierName = 'email',
  identifierLabel,
  identifierType = 'email',
  identifierPlaceholder,
  passwordPlaceholder,
  autoFocus,
  normalizeIdentifier,
  callbackUrl = '/',
  forgotPasswordHref,
  errorMessages,
  errorClassName,
  onSubmit,
  onSuccess,
  className,
  submitClassName,
}: SignInFormProps) {
  const t = useTelamonjsT()
  const text = useText()
  const router = useRouter()
  const id = useId()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ReactNode>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>()
  const [showPassword, setShowPassword] = useState(false)

  const schema = useMemo(() => {
    const required = t('validation.required')
    const identifier = z.string().trim().min(1, required)
    return z.object({
      identifier:
        identifierType === 'email' ? identifier.email(t('validation.invalidEmail')) : identifier,
      password: z.string().min(1, required),
    })
  }, [t, identifierType])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  })

  const errorText = (res: { error?: string | null; code?: string | null }) => {
    const custom = (res.code && errorMessages?.[res.code]) || (res.error && errorMessages?.[res.error])
    if (isValidElement(custom)) return custom
    if (custom) return text(custom as I18nText) ?? ''
    return res.error === 'CredentialsSignin' ? t('auth.invalidCredentials') : t('auth.signInError')
  }

  const submit = handleSubmit(async (raw) => {
    setPending(true)
    setError(null)
    const values = {
      identifier: normalizeIdentifier ? normalizeIdentifier(raw.identifier) : raw.identifier,
      password: raw.password,
    }
    const url =
      sameOriginPath(new URLSearchParams(window.location.search).get('callbackUrl')) ??
      sameOriginPath(callbackUrl) ??
      '/'
    try {
      const res = onSubmit
        ? await onSubmit(values)
        : await signIn('credentials', {
            [identifierName]: values.identifier,
            password: values.password,
            redirect: false,
            callbackUrl: url,
          })
      if (res?.error) {
        setErrorCode(res.code ?? res.error ?? undefined)
        setError(errorText(res))
        setPending(false)
        return
      }
      // Stays pending: the page is about to change.
      if (onSuccess) await onSuccess(url)
      else {
        router.push(url)
        router.refresh()
      }
    } catch {
      setErrorCode(undefined)
      setError(t('auth.signInError'))
      setPending(false)
    }
  })

  const identifierId = `${id}-identifier`
  const passwordId = `${id}-password`

  return (
    <form onSubmit={submit} noValidate className={cn('space-y-4', className)}>
      {error && (
        <div
          role='alert'
          className={cn(
            'rounded-md bg-destructive/10 p-3 text-sm text-destructive',
            typeof errorClassName === 'function' ? errorClassName(errorCode) : errorClassName
          )}
        >
          {error}
        </div>
      )}

      <div className='space-y-2'>
        <Label htmlFor={identifierId}>{text(identifierLabel) ?? t('auth.identifierLabel')}</Label>
        <Input
          id={identifierId}
          type={identifierType}
          autoComplete='username'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
          placeholder={text(identifierPlaceholder)}
          // opt-in: a page whose only task is signing in
          autoFocus={autoFocus}
          disabled={pending}
          aria-invalid={errors.identifier ? true : undefined}
          aria-describedby={errors.identifier ? `${identifierId}-error` : undefined}
          {...register('identifier')}
        />
        <FieldError id={`${identifierId}-error`} message={errors.identifier?.message} />
      </div>

      <div className='space-y-2'>
        <Label htmlFor={passwordId}>{t('auth.passwordLabel')}</Label>
        <div className='relative'>
          <Input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            autoComplete='current-password'
            placeholder={text(passwordPlaceholder)}
            className='pr-10'
            disabled={pending}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            {...register('password')}
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute right-0 top-0 text-muted-foreground hover:bg-transparent'
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            aria-controls={passwordId}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff aria-hidden='true' /> : <Eye aria-hidden='true' />}
          </Button>
        </div>
        <FieldError id={`${passwordId}-error`} message={errors.password?.message} />
      </div>

      {forgotPasswordHref && (
        <div className='flex justify-end'>
          <Link
            href={forgotPasswordHref}
            className='text-sm text-muted-foreground hover:text-foreground hover:underline'
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
      )}

      {/* data-testid kept from the CLI template's form, which e2e suites already target */}
      <Button type='submit' className={cn('w-full', submitClassName)} loading={pending} data-testid='submit-button'>
        {pending ? t('auth.submitting') : t('auth.submit')}
      </Button>
    </form>
  )
}
