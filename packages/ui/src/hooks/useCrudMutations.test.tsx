/**
 * TDD for A2: `MutationsConfig.create/update/delete` become
 * optional — a read-only (or partially read-only) module no longer needs
 * `{ success: false }` stubs. useCrudMutations must guard every mutationFn
 * call so an absent mutation resolves as a safe no-op instead of throwing.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { z } from 'zod'
import type { ReactNode } from 'react'
import { useCrudMutations } from './useCrudMutations'
import type { CrudConfig, MutationsConfig } from '../types/crud'

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

interface MockUser extends Record<string, unknown> {
  id: string
  name: string
  email: string
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function makeConfig(
  mutations: MutationsConfig<MockUser>
): CrudConfig<MockUser> {
  return {
    module: { name: 'users', title: 'Users', route: '/admin/users' },
    list: { columns: [] },
    form: { sections: [], validation: z.object({}) },
    query: { queryKey: ['users'], queryFn: vi.fn() },
    mutations,
  }
}

describe('useCrudMutations - optional create/update/delete (A2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('read-only config (no create/update/delete) resolves every mutation as a safe no-op, no throw', async () => {
    const config = makeConfig({
      getForView: async id => ({ id, name: 'Alice', email: 'a@a.com' }),
    })
    const { result } = renderHook(() => useCrudMutations({ config }), {
      wrapper: makeWrapper(),
    })

    await expect(
      result.current.createMutation.mutateAsync({ name: 'x', email: 'x@x.com' })
    ).resolves.toEqual({ success: false, message: 'Criação não configurada.' })

    await expect(
      result.current.updateMutation.mutateAsync({ id: '1', data: {} })
    ).resolves.toEqual({
      success: false,
      message: 'Atualização não configurada.',
    })

    await expect(
      result.current.deleteMutation.mutateAsync({ id: '1' })
    ).resolves.toEqual({ success: false, message: 'Exclusão não configurada.' })
  })

  it('does not invalidate queries or show a toast for a missing mutation', async () => {
    const config = makeConfig({})
    const { result } = renderHook(() => useCrudMutations({ config }), {
      wrapper: makeWrapper(),
    })

    result.current.deleteMutation.mutate({ id: '1' })

    await waitFor(() =>
      expect(result.current.deleteMutation.isSuccess).toBe(true)
    )
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('a config that only provides `update` still runs it normally (partial read-only)', async () => {
    const update = vi.fn().mockResolvedValue({ success: true, message: 'ok' })
    const config = makeConfig({
      update: { mutationFn: update, invalidates: [] },
    })
    const { result } = renderHook(() => useCrudMutations({ config }), {
      wrapper: makeWrapper(),
    })

    await result.current.updateMutation.mutateAsync({
      id: '1',
      data: { name: 'y' },
    })
    expect(update).toHaveBeenCalledWith({ id: '1', data: { name: 'y' } })

    await expect(
      result.current.createMutation.mutateAsync({ name: 'x', email: 'x@x.com' })
    ).resolves.toEqual({ success: false, message: 'Criação não configurada.' })
  })

  it('type-check: MutationsConfig accepts a read-only config with no create/update/delete stubs', () => {
    const mutations: MutationsConfig<MockUser> = {
      getForView: async id => ({ id, name: 'x', email: 'x@x.com' }),
    }
    expect(mutations.create).toBeUndefined()
    expect(mutations.update).toBeUndefined()
    expect(mutations.delete).toBeUndefined()
  })
})

describe('useCrudMutations - invalidation does not block the mutation (7.3.1)', () => {
  it('create resolves even if the list refetch never settles', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(
      new Promise<void>(() => undefined)
    )
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const config = makeConfig({
      create: {
        mutationFn: async () => ({ success: true }),
        invalidates: [['users']],
      },
    })
    const { result } = renderHook(() => useCrudMutations({ config }), {
      wrapper,
    })
    await expect(
      result.current.createMutation.mutateAsync({
        id: '1',
        name: 'A',
        email: 'a@a',
      })
    ).resolves.toEqual({ success: true })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['users'],
    })
  })
})

describe('useCrudMutations - resolves after the list refetch', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  // An active ['users'] list (useQuery mounted) + the mutations, one client.
  function setup(queryFn: () => Promise<unknown>, retry: number | false) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry, retryDelay: 60_000 },
        mutations: { retry: false },
      },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const config = makeConfig({
      create: {
        mutationFn: async () => ({ success: true }),
        invalidates: [['users']],
      },
    })
    const hook = renderHook(
      () => {
        const list = useQuery({ queryKey: ['users'], queryFn })
        return { list, ...useCrudMutations({ config }) }
      },
      { wrapper }
    )
    return { ...hook, queryClient }
  }

  it('create resolves only once the invalidated list has refetched', async () => {
    const refetch = deferred<string[]>()
    let calls = 0
    const queryFn = () => (++calls === 1 ? Promise.resolve(['a']) : refetch.promise)
    const { result, queryClient } = setup(queryFn, false)
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true))

    let settled = false
    const done = result.current.createMutation
      .mutateAsync({ name: 'B', email: 'b@b' })
      .then(r => {
        settled = true
        return r
      })
    await waitFor(() => expect(calls).toBe(2))
    await new Promise(r => setTimeout(r, 20))
    expect(settled).toBe(false)

    refetch.resolve(['a', 'b'])
    await expect(done).resolves.toEqual({ success: true })
    // the cache already holds the fresh list when the dialog would close
    expect(queryClient.getQueryData(['users'])).toEqual(['a', 'b'])
  })

  it('a failing refetch settles the mutation on its first failure, without waiting for retries', async () => {
    let calls = 0
    const queryFn = () =>
      ++calls === 1 ? Promise.resolve(['a']) : Promise.reject(new Error('list 500'))
    const { result } = setup(queryFn, 3)
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true))

    // retryDelay is 60s: resolving at all proves no retry is awaited
    await expect(
      result.current.createMutation.mutateAsync({ name: 'B', email: 'b@b' })
    ).resolves.toEqual({ success: true })
    expect(calls).toBe(2)
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('useCrudMutations - global error handler contract (7.13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tags every mutation with meta.skipErrorToast so an app MutationCache.onError can skip the toast the lib already shows', async () => {
    const globalOnError = vi.fn()
    const queryClient = new QueryClient({
      mutationCache: new MutationCache({ onError: globalOnError }),
      defaultOptions: { mutations: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const config = makeConfig({
      create: {
        mutationFn: async () => {
          throw new Error('boom')
        },
      },
    })
    const { result } = renderHook(() => useCrudMutations({ config }), {
      wrapper,
    })

    await expect(
      result.current.createMutation.mutateAsync({ name: 'x', email: 'x@x' })
    ).rejects.toThrow('boom')

    expect(globalOnError).toHaveBeenCalledTimes(1)
    const mutation = globalOnError.mock.calls[0][3]
    expect(mutation.meta).toEqual({ skipErrorToast: true })
    // the lib's own toast still shows, exactly once
    expect(toastError).toHaveBeenCalledTimes(1)
  })
})
