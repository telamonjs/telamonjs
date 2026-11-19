/**
 * Job Priority System
 *
 * BullMQ uses numeric priorities (1-10, lower number = higher priority).
 * This module provides semantic priority levels and utilities.
 */

/**
 * Job Priority Levels
 *
 * Lower numbers = higher priority in BullMQ
 */
export enum JobPriority {
  /**
   * Critical priority - processed immediately
   * Use for: System alerts, critical failures, urgent user actions
   */
  CRITICAL = 1,

  /**
   * High priority - processed before normal jobs
   * Use for: User-facing operations, time-sensitive tasks
   */
  HIGH = 3,

  /**
   * Normal priority (default)
   * Use for: Regular background jobs, standard processing
   */
  NORMAL = 5,

  /**
   * Low priority - processed when system has capacity
   * Use for: Cleanup, analytics, non-urgent tasks
   */
  LOW = 8,

  /**
   * Deferred priority - lowest priority
   * Use for: Batch processing, reporting, maintenance tasks
   */
  DEFERRED = 10,
}

/**
 * Priority names for display/logging
 */
export const PRIORITY_NAMES: Record<JobPriority, string> = {
  [JobPriority.CRITICAL]: 'Critical',
  [JobPriority.HIGH]: 'High',
  [JobPriority.NORMAL]: 'Normal',
  [JobPriority.LOW]: 'Low',
  [JobPriority.DEFERRED]: 'Deferred',
}

/**
 * Priority descriptions
 */
export const PRIORITY_DESCRIPTIONS: Record<JobPriority, string> = {
  [JobPriority.CRITICAL]:
    'Processed immediately - system alerts, critical failures',
  [JobPriority.HIGH]: 'Processed before normal jobs - user-facing operations',
  [JobPriority.NORMAL]: 'Default priority - regular background jobs',
  [JobPriority.LOW]: 'Processed when system has capacity - cleanup, analytics',
  [JobPriority.DEFERRED]: 'Lowest priority - batch processing, maintenance',
}

/**
 * Get priority name
 *
 * @param priority - Priority value (1-10)
 * @returns Priority name
 *
 * @example
 * ```ts
 * getPriorityName(JobPriority.CRITICAL)  // "Critical"
 * getPriorityName(1)                      // "Critical"
 * getPriorityName(5)                      // "Normal"
 * ```
 */
export function getPriorityName(priority: number): string {
  // Find closest priority level
  const priorities = Object.values(JobPriority).filter(
    p => typeof p === 'number'
  ) as number[]
  const closest = priorities.reduce((prev, curr) =>
    Math.abs(curr - priority) < Math.abs(prev - priority) ? curr : prev
  )

  return PRIORITY_NAMES[closest as JobPriority] || `Priority ${priority}`
}

/**
 * Get priority description
 *
 * @param priority - Priority value
 * @returns Priority description
 */
export function getPriorityDescription(priority: number): string {
  const priorities = Object.values(JobPriority).filter(
    p => typeof p === 'number'
  ) as number[]
  const closest = priorities.reduce((prev, curr) =>
    Math.abs(curr - priority) < Math.abs(prev - priority) ? curr : prev
  )

  return (
    PRIORITY_DESCRIPTIONS[closest as JobPriority] || 'Custom priority level'
  )
}

/**
 * Check if a priority is higher than another
 *
 * @param priority1 - First priority
 * @param priority2 - Second priority
 * @returns true if priority1 > priority2 (lower number = higher priority)
 *
 * @example
 * ```ts
 * isHigherPriority(JobPriority.CRITICAL, JobPriority.NORMAL)  // true
 * isHigherPriority(JobPriority.LOW, JobPriority.HIGH)         // false
 * ```
 */
export function isHigherPriority(
  priority1: number,
  priority2: number
): boolean {
  return priority1 < priority2
}

/**
 * Get the highest priority from a list
 *
 * @param priorities - List of priorities
 * @returns Highest priority (lowest number)
 *
 * @example
 * ```ts
 * getHighestPriority([5, 1, 8])  // 1 (CRITICAL)
 * ```
 */
export function getHighestPriority(priorities: number[]): number {
  if (priorities.length === 0) {
    return JobPriority.NORMAL
  }
  return Math.min(...priorities)
}

/**
 * Get the lowest priority from a list
 *
 * @param priorities - List of priorities
 * @returns Lowest priority (highest number)
 *
 * @example
 * ```ts
 * getLowestPriority([5, 1, 8])  // 8 (LOW)
 * ```
 */
export function getLowestPriority(priorities: number[]): number {
  if (priorities.length === 0) {
    return JobPriority.NORMAL
  }
  return Math.max(...priorities)
}

/**
 * Validate priority value
 *
 * @param priority - Priority to validate
 * @returns true if valid (1-10)
 *
 * @example
 * ```ts
 * isValidPriority(5)   // true
 * isValidPriority(0)   // false
 * isValidPriority(11)  // false
 * ```
 */
export function isValidPriority(priority: number): boolean {
  return Number.isInteger(priority) && priority >= 1 && priority <= 10
}

/**
 * Clamp priority to valid range (1-10)
 *
 * @param priority - Priority to clamp
 * @returns Clamped priority
 *
 * @example
 * ```ts
 * clampPriority(0)   // 1
 * clampPriority(15)  // 10
 * clampPriority(5)   // 5
 * ```
 */
export function clampPriority(priority: number): number {
  return Math.max(1, Math.min(10, Math.round(priority)))
}

/**
 * Sort jobs by priority (highest first)
 *
 * @param jobs - Jobs with priority property
 * @returns Sorted jobs (highest priority first)
 *
 * @example
 * ```ts
 * const jobs = [
 *   { id: '1', priority: 5 },
 *   { id: '2', priority: 1 },
 *   { id: '3', priority: 8 }
 * ]
 * sortByPriority(jobs)
 * // [{ id: '2', priority: 1 }, { id: '1', priority: 5 }, { id: '3', priority: 8 }]
 * ```
 */
export function sortByPriority<T extends { priority?: number }>(
  jobs: T[]
): T[] {
  return [...jobs].sort((a, b) => {
    const priorityA = a.priority ?? JobPriority.NORMAL
    const priorityB = b.priority ?? JobPriority.NORMAL
    return priorityA - priorityB // Lower number = higher priority
  })
}

/**
 * Group jobs by priority level
 *
 * @param jobs - Jobs with priority property
 * @returns Jobs grouped by priority level
 *
 * @example
 * ```ts
 * const jobs = [
 *   { id: '1', priority: 1 },
 *   { id: '2', priority: 3 },
 *   { id: '3', priority: 1 }
 * ]
 * groupByPriority(jobs)
 * // {
 * //   1: [{ id: '1', priority: 1 }, { id: '3', priority: 1 }],
 * //   3: [{ id: '2', priority: 3 }]
 * // }
 * ```
 */
export function groupByPriority<T extends { priority?: number }>(
  jobs: T[]
): Record<number, T[]> {
  const groups: Record<number, T[]> = {}

  for (const job of jobs) {
    const priority = job.priority ?? JobPriority.NORMAL
    if (!groups[priority]) {
      groups[priority] = []
    }
    groups[priority].push(job)
  }

  return groups
}

/**
 * Calculate priority distribution
 *
 * @param jobs - Jobs with priority property
 * @returns Priority distribution stats
 *
 * @example
 * ```ts
 * const jobs = [
 *   { priority: 1 },
 *   { priority: 1 },
 *   { priority: 5 },
 *   { priority: 8 }
 * ]
 * getPriorityDistribution(jobs)
 * // {
 * //   total: 4,
 * //   byLevel: {
 * //     1: { count: 2, percentage: 50 },
 * //     5: { count: 1, percentage: 25 },
 * //     8: { count: 1, percentage: 25 }
 * //   },
 * //   averagePriority: 3.75
 * // }
 * ```
 */
export function getPriorityDistribution<T extends { priority?: number }>(
  jobs: T[]
): {
  total: number
  byLevel: Record<number, { count: number; percentage: number }>
  averagePriority: number
} {
  const total = jobs.length
  const byLevel: Record<number, { count: number; percentage: number }> = {}
  let sum = 0

  for (const job of jobs) {
    const priority = job.priority ?? JobPriority.NORMAL
    sum += priority

    if (!byLevel[priority]) {
      byLevel[priority] = { count: 0, percentage: 0 }
    }
    byLevel[priority].count++
  }

  // Calculate percentages
  for (const priority in byLevel) {
    byLevel[priority].percentage = (byLevel[priority].count / total) * 100
  }

  return {
    total,
    byLevel,
    averagePriority: total > 0 ? sum / total : JobPriority.NORMAL,
  }
}

/**
 * Suggest priority based on job characteristics
 *
 * This is a helper function to suggest appropriate priority levels
 * based on job characteristics.
 *
 * @param characteristics - Job characteristics
 * @returns Suggested priority
 *
 * @example
 * ```ts
 * suggestPriority({ userFacing: true, timeoutMs: 5000 })  // JobPriority.HIGH
 * suggestPriority({ userFacing: false, batch: true })     // JobPriority.LOW
 * ```
 */
export function suggestPriority(characteristics: {
  userFacing?: boolean
  critical?: boolean
  timeoutMs?: number
  batch?: boolean
  cleanup?: boolean
}): JobPriority {
  const { userFacing, critical, timeoutMs, batch, cleanup } = characteristics

  // Critical or user-facing with tight timeout
  if (critical || (userFacing && timeoutMs && timeoutMs < 5000)) {
    return JobPriority.CRITICAL
  }

  // User-facing operations
  if (userFacing) {
    return JobPriority.HIGH
  }

  // Batch or cleanup operations
  if (batch || cleanup) {
    return JobPriority.LOW
  }

  // Default
  return JobPriority.NORMAL
}
