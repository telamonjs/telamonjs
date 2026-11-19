'use server'

import { revalidatePath as nextRevalidatePath } from 'next/cache'

/**
 * Server Action to revalidate the Next.js cache
 *
 * Used automatically by ListPage when configured via AppProviders.
 * Clears the Next.js cache without forcing a full page re-render (router.refresh).
 *
 * @param path - Path to revalidate (e.g. '/admin/usuarios')
 * @param type - 'page' (page only) or 'layout' (page + sub-routes). Default: 'layout'
 *
 * @example
 * ```tsx
 * // Setup em AppProviders (1x)
 * import { AppProviders, revalidatePathAction } from '@telamonjs/ui'
 *
 * <AppProviders config={{ revalidateAction: revalidatePathAction }}>
 *   {children}
 * </AppProviders>
 * ```
 *
 * @example
 * ```tsx
 * // Uso direto em Server Action
 * 'use server'
 * import { revalidatePathAction } from '@telamonjs/ui'
 *
 * export async function refreshData() {
 *   await revalidatePathAction('/admin/usuarios', 'layout')
 * }
 * ```
 *
 */
export async function revalidatePathAction(
  path: string,
  type: 'page' | 'layout' = 'layout'
) {
  nextRevalidatePath(path, type)
}
