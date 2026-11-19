'use client'

/**
 * Job Config Hooks
 *
 * React Query hooks for job configuration CRUD operations.
 * Uses QueueConfigApiAdapter via useQueueConfigApi().
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useQueueConfigApi } from '../api/provider'
import type { JobConfigUpdateInput } from '../types'
import { LIB_QUERY_META } from '../../utils/query-meta'

/**
 * Hook to fetch all job configurations (ordered by module).
 */
export function useAllJobs() {
  const configApi = useQueueConfigApi()

  return useQuery({
    meta: LIB_QUERY_META,
    queryKey: ['jobs', 'all'],
    queryFn: () => configApi!.getJobConfigs(),
    enabled: !!configApi,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to fetch details of a specific job with user info.
 */
export function useJobDetails(jobName: string | null | undefined) {
  const configApi = useQueueConfigApi()

  return useQuery({
    meta: LIB_QUERY_META,
    queryKey: ['jobs', 'config', jobName],
    queryFn: () => configApi!.getJobConfig(jobName!),
    enabled: !!configApi && !!jobName,
    staleTime: 30_000,
  })
}

/**
 * Hook to fetch configuration change history for a job.
 */
export function useJobHistory(jobName: string | null | undefined) {
  const configApi = useQueueConfigApi()

  return useQuery({
    meta: LIB_QUERY_META,
    queryKey: ['jobs', 'history', jobName],
    queryFn: () => configApi!.getJobConfigHistory(jobName!),
    enabled: !!configApi && !!jobName,
    staleTime: 30_000,
  })
}

/**
 * Hook to toggle a job's enabled/disabled state.
 */
export function useToggleJobEnabled() {
  const queryClient = useQueryClient()
  const configApi = useQueueConfigApi()

  return useMutation({
    meta: LIB_QUERY_META,
    mutationFn: ({ jobName, enabled }: { jobName: string; enabled: boolean }) =>
      configApi!.toggleJobConfig(jobName, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/**
 * Hook to update a job's configuration (cron, priority, concurrency, timeout, description).
 */
export function useUpdateJobConfig() {
  const queryClient = useQueryClient()
  const configApi = useQueueConfigApi()

  return useMutation({
    meta: LIB_QUERY_META,
    mutationFn: ({
      jobName,
      updates,
    }: {
      jobName: string
      updates: JobConfigUpdateInput
    }) => configApi!.updateJobConfig(jobName, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/**
 * Hook to toggle enabled/disabled for all jobs in a module.
 */
export function useToggleModuleJobs() {
  const queryClient = useQueryClient()
  const configApi = useQueueConfigApi()

  return useMutation({
    meta: LIB_QUERY_META,
    mutationFn: ({ module, enabled }: { module: string; enabled: boolean }) =>
      configApi!.toggleModuleJobConfigs(module, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
