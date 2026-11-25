import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canAny } from '@/lib/permissions'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in')
  }
  return user
}

/**
 * Route Handler gate: the session user when they hold any of `permissions`
 * (OR, like `@Permissions` on the API), else the 401/403 response to return
 * as is. The claims are fresh: `auth()` refreshes a stale token first.
 *
 * @example
 * const user = await requirePermission('users.write')
 * if (user instanceof NextResponse) return user
 */
export async function requirePermission(...permissions: [string, ...string[]]) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canAny(user, permissions)) {
    return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
  }
  return user
}
