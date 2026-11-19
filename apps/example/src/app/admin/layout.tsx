import { auth } from '@/auth'
import { LayoutProviders } from '@/components/providers/LayoutProviders'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Fail closed: on an auth error `auth()` resolves the error body (truthy,
  // no `user`), so only a real user counts as signed in.
  if (!session?.user) {
    redirect('/sign-in')
  }

  return <LayoutProviders session={session}>{children}</LayoutProviders>
}
