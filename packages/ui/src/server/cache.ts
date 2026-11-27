'use server'

import { revalidatePath as nextRevalidatePath } from 'next/cache'

/**
 * Server Action that revalidates the Next.js cache for a path.
 *
 * It checks nothing: a Server Action is a public endpoint, and once a client
 * component references this one (for example as `AppProviders`'
 * `revalidateAction`), any visitor can call it with any path. Call it from a
 * Server Action of your own that checks the session first, or wire your own
 * action instead (see the provider setup docs).
 *
 * @param path - Path to revalidate (e.g. '/admin/usuarios')
 * @param type - 'page' (page only) or 'layout' (page + sub-routes). Default: 'layout'
 *
 * @example
 * ```tsx
 * 'use server'
 * import { revalidatePathAction } from '@telamonjs/ui/server'
 * import { auth } from '@/auth'
 *
 * export async function revalidateAdminPath(path: string, type: 'page' | 'layout' = 'layout') {
 *   if (!(await auth())?.user || !/^\/admin(\/|$)/.test(path)) return
 *   await revalidatePathAction(path, type)
 * }
 * ```
 */
export async function revalidatePathAction(
  path: string,
  type: 'page' | 'layout' = 'layout'
) {
  nextRevalidatePath(path, type)
}
