'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button, Input, Label } from '@telamonjs/ui'
import { invitationsApi, type InvitationPreview } from '@/lib/api/invitations-client'

type View = { kind: 'loading' } | { kind: 'closed'; reason: 'invalid' | 'expired' | 'accepted' } | { kind: 'open'; email: string }

/**
 * Public accept page (outside the admin shell, like /sign-in): the invitee
 * picks a name and password, the account is created, then they are signed in
 * with the same credentials. Unusable links get neutral wording.
 */
export default function AcceptInvitationPage() {
  const t = useTranslations('convites.accept')
  const router = useRouter()
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    invitationsApi
      .byToken(token)
      .then((preview: InvitationPreview) => {
        if (preview.status === 'PENDING') {
          setName(preview.name ?? '')
          setView({ kind: 'open', email: preview.email })
        } else {
          setView({
            kind: 'closed',
            reason: preview.status === 'EXPIRED' ? 'expired' : preview.status === 'ACCEPTED' ? 'accepted' : 'invalid',
          })
        }
      })
      .catch(() => setView({ kind: 'closed', reason: 'invalid' }))
  }, [token])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (view.kind !== 'open') return
    if (password.length < 8) return setError(t('passwordTooShort'))
    if (password !== confirm) return setError(t('passwordMismatch'))
    setPending(true)
    setError(null)
    try {
      await invitationsApi.accept({ token, name, password })
    } catch (e) {
      setPending(false)
      return setError(e instanceof Error ? e.message : t('error'))
    }
    const res = await signIn('credentials', { email: view.email, password, redirect: false })
    if (res?.error) return router.push('/sign-in')
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/50 px-4'>
      <div className='w-full max-w-md rounded-lg border bg-background p-8 shadow-sm'>
        <h1 className='mb-2 text-2xl font-bold'>{t('title')}</h1>

        {view.kind === 'loading' && <p className='text-sm text-muted-foreground'>{t('loading')}</p>}

        {view.kind === 'closed' && (
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>{t(view.reason)}</p>
            <Button asChild variant='outline' className='w-full'>
              <Link href='/sign-in'>{t('signIn')}</Link>
            </Button>
          </div>
        )}

        {view.kind === 'open' && (
          <form onSubmit={submit} noValidate className='space-y-4'>
            <p className='text-sm text-muted-foreground'>{t('subtitle', { email: view.email })}</p>
            {error && (
              <div role='alert' className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {error}
              </div>
            )}
            <div className='space-y-2'>
              <Label htmlFor='invite-name'>{t('name')}</Label>
              <Input
                id='invite-name'
                autoComplete='name'
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='invite-password'>{t('password')}</Label>
              <Input
                id='invite-password'
                type='password'
                autoComplete='new-password'
                required
                minLength={8}
                aria-describedby='invite-password-hint'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
              <p id='invite-password-hint' className='text-xs text-muted-foreground'>
                {t('passwordHint')}
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='invite-confirm'>{t('confirmPassword')}</Label>
              <Input
                id='invite-confirm'
                type='password'
                autoComplete='new-password'
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button type='submit' className='w-full' loading={pending} disabled={!name.trim()}>
              {pending ? t('submitting') : t('submit')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
