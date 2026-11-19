/**
 * useCrudMutations - React Query mutations for CrudConfig
 *
 * Provides unified mutations (create/update/delete) with automatic cache invalidation.
 *
 * @example
 * pattern (React Query - automatic invalidation):
 * ```tsx
 * const { createMutation, updateMutation, deleteMutation } = useCrudMutations({ config })
 *
 * // Create
 * await createMutation.mutateAsync(formData)
 * // Automatically invalidates ['fabricantes'] cache
 *
 * // Update
 * await updateMutation.mutateAsync({ id: '1', data: formData })
 * // Automatically invalidates ['fabricantes'] and ['fabricantes', '1'] caches
 * ```
 */

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import type { CrudConfig } from '../types/crud'
import { toast } from 'sonner'
import { markToasted } from '../utils/toasted-error'
import { getErrorMessage } from '../utils/error-message'
import { useTelamonjsT } from '../i18n/use-t'
import { LIB_QUERY_META } from '../utils/query-meta'

interface UseCrudMutationsParams<T, TFormData> {
  /** CrudConfig with mutations */
  config: CrudConfig<T, TFormData>
}

interface UseCrudMutationsReturn<TFormData> {
  /** Create mutation */
  createMutation: {
    mutate: (data: TFormData) => void
    // `any` kept intentionally: resolved value shape is whatever the
    // consumer's mutationFn returns (ListPage expects FormActionResult<T>,
    // other callers expect other shapes) — narrowing here breaks ListPage.tsx.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateAsync: (data: TFormData) => Promise<any>
    isPending: boolean
    isSuccess: boolean
    isError: boolean
    error: Error | null
  }
  /** Update mutation */
  updateMutation: {
    mutate: (variables: { id: string; data: Partial<TFormData> }) => void
    mutateAsync: (variables: {
      id: string
      data: Partial<TFormData>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createMutation.mutateAsync above
    }) => Promise<any>
    isPending: boolean
    isSuccess: boolean
    isError: boolean
    error: Error | null
  }
  /** Delete mutation */
  deleteMutation: {
    mutate: (variables: { id: string }) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createMutation.mutateAsync above
    mutateAsync: (variables: { id: string }) => Promise<any>
    isPending: boolean
    isSuccess: boolean
    isError: boolean
    error: Error | null
  }
}

/**
 * Unified mutations hook for CrudConfig
 *
 * Uses React Query mutations with automatic cache invalidation.
 */
export function useCrudMutations<T, TFormData = T>({
  config,
}: UseCrudMutationsParams<T, TFormData>): UseCrudMutationsReturn<TFormData> {
  const t = useTelamonjsT()
  const queryClient = useQueryClient()
  const { mutations } = config

  if (!mutations) {
    throw new Error(
      '[useCrudMutations] Invalid CrudConfig: missing required "mutations" field'
    )
  }

  // Helper to invalidate queries (parallel). Fire-and-forget: the mutation —
  // and the dialog awaiting it — settles as soon as the server confirmed. Awaiting
  // the list refetch here kept "Salvando…" on screen while a failing refetch
  // retried (create 201 + list 500, consumer QA).
  const invalidateQueries = (
    invalidates: (QueryKey | ((id?: string) => QueryKey))[],
    id?: string
  ): void => {
    const invalidationPromises = invalidates.map(keyOrFn => {
      const key = typeof keyOrFn === 'function' ? keyOrFn(id) : keyOrFn
      return queryClient.invalidateQueries({ queryKey: key })
    })
    void Promise.all(invalidationPromises).catch(() => undefined)
  }

  // CREATE MUTATION
  const createMutation = useMutation({
    meta: LIB_QUERY_META,
    mutationFn: async (data: TFormData) => {
      // mutations.create is optional (read-only/no-create modules).
      // No caller should reach this without a create dialog/button wired to
      // it, but the fallback keeps an accidental call a safe no-op.
      if (!mutations.create) {
        return { success: false, message: t('toast.createNotConfigured') }
      }
      return await mutations.create.mutationFn(data)
    },
    onSuccess: (result, variables) => {
      // Automatic cache invalidation
      if (mutations.create?.invalidates) {
        invalidateQueries(mutations.create.invalidates)
      }

      // Call custom onSuccess
      mutations.create?.onSuccess?.(result, variables)

      // Show success toast
      if (result?.success && result?.message) {
        toast.success(result.message)
      }
    },
    onError: (error: Error, variables) => {
      // Call custom onError
      mutations.create?.onError?.(error, variables)

      // Show error toast
      toast.error(getErrorMessage(error) ?? t('toast.createError'))
      markToasted(error)
    },
  })

  // UPDATE MUTATION
  const updateMutation = useMutation({
    meta: LIB_QUERY_META,
    mutationFn: async (variables: { id: string; data: Partial<TFormData> }) => {
      // mutations.update is optional — see create's comment above.
      if (!mutations.update) {
        return { success: false, message: t('toast.updateNotConfigured') }
      }
      return await mutations.update.mutationFn(variables)
    },
    onSuccess: (result, variables) => {
      // Automatic cache invalidation
      if (mutations.update?.invalidates) {
        invalidateQueries(mutations.update.invalidates, variables.id)
      }

      // Call custom onSuccess
      mutations.update?.onSuccess?.(result, variables)

      // Show success toast
      if (result?.success && result?.message) {
        toast.success(result.message)
      }
    },
    onError: (error: Error, variables) => {
      // Call custom onError
      mutations.update?.onError?.(error, variables)

      // Show error toast
      toast.error(getErrorMessage(error) ?? t('toast.updateError'))
      markToasted(error)
    },
  })

  // DELETE MUTATION
  const deleteMutation = useMutation({
    meta: LIB_QUERY_META,
    mutationFn: async (variables: { id: string }) => {
      // mutations.delete is optional — see create's comment above.
      if (!mutations.delete) {
        return { success: false, message: t('toast.deleteNotConfigured') }
      }
      return await mutations.delete.mutationFn(variables)
    },
    onSuccess: (result, variables) => {
      // Automatic cache invalidation
      if (mutations.delete?.invalidates) {
        invalidateQueries(mutations.delete.invalidates, variables.id)
      }

      // Call custom onSuccess
      mutations.delete?.onSuccess?.(result, variables)

      // Show success toast
      if (result?.success && result?.message) {
        toast.success(result.message)
      }
    },
    onError: (error: Error, variables) => {
      // Call custom onError
      mutations.delete?.onError?.(error, variables)

      // Show error toast
      toast.error(getErrorMessage(error) ?? t('toast.deleteError'))
      markToasted(error)
    },
  })

  return {
    createMutation: {
      mutate: createMutation.mutate,
      mutateAsync: createMutation.mutateAsync,
      isPending: createMutation.isPending,
      isSuccess: createMutation.isSuccess,
      isError: createMutation.isError,
      error: createMutation.error,
    },
    updateMutation: {
      mutate: updateMutation.mutate,
      mutateAsync: updateMutation.mutateAsync,
      isPending: updateMutation.isPending,
      isSuccess: updateMutation.isSuccess,
      isError: updateMutation.isError,
      error: updateMutation.error,
    },
    deleteMutation: {
      mutate: deleteMutation.mutate,
      mutateAsync: deleteMutation.mutateAsync,
      isPending: deleteMutation.isPending,
      isSuccess: deleteMutation.isSuccess,
      isError: deleteMutation.isError,
      error: deleteMutation.error,
    },
  }
}
