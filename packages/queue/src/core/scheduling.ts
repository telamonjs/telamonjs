/**
 * Advanced Scheduling System
 *
 * Provides human-readable schedule helpers, timezone support,
 * and schedule validation utilities.
 */

import cronParser from 'cron-parser'
import type { CronSchedule } from './types.js'

/**
 * Common schedule patterns (human-readable)
 */
export const SchedulePatterns = {
  /**
   * Every minute
   */
  EVERY_MINUTE: '* * * * *',

  /**
   * Every 5 minutes
   */
  EVERY_5_MINUTES: '*/5 * * * *',

  /**
   * Every 10 minutes
   */
  EVERY_10_MINUTES: '*/10 * * * *',

  /**
   * Every 15 minutes
   */
  EVERY_15_MINUTES: '*/15 * * * *',

  /**
   * Every 30 minutes
   */
  EVERY_30_MINUTES: '*/30 * * * *',

  /**
   * Every hour
   */
  EVERY_HOUR: '0 * * * *',

  /**
   * Every 2 hours
   */
  EVERY_2_HOURS: '0 */2 * * *',

  /**
   * Every 6 hours
   */
  EVERY_6_HOURS: '0 */6 * * *',

  /**
   * Every 12 hours
   */
  EVERY_12_HOURS: '0 */12 * * *',

  /**
   * Daily at midnight
   */
  DAILY_AT_MIDNIGHT: '0 0 * * *',

  /**
   * Daily at noon
   */
  DAILY_AT_NOON: '0 12 * * *',

  /**
   * Weekly on Monday at midnight
   */
  WEEKLY_MONDAY: '0 0 * * 1',

  /**
   * Weekly on Sunday at midnight
   */
  WEEKLY_SUNDAY: '0 0 * * 0',

  /**
   * Monthly on 1st at midnight
   */
  MONTHLY_FIRST: '0 0 1 * *',

  /**
   * Monthly on last day at midnight
   */
  MONTHLY_LAST: '0 0 L * *',

  /**
   * Yearly on January 1st at midnight
   */
  YEARLY: '0 0 1 1 *',
} as const

/**
 * Common timezones
 */
export const Timezones = {
  UTC: 'UTC',
  // Americas
  AMERICA_NEW_YORK: 'America/New_York',
  AMERICA_CHICAGO: 'America/Chicago',
  AMERICA_DENVER: 'America/Denver',
  AMERICA_LOS_ANGELES: 'America/Los_Angeles',
  AMERICA_SAO_PAULO: 'America/Sao_Paulo',
  AMERICA_BUENOS_AIRES: 'America/Argentina/Buenos_Aires',
  // Europe
  EUROPE_LONDON: 'Europe/London',
  EUROPE_PARIS: 'Europe/Paris',
  EUROPE_BERLIN: 'Europe/Berlin',
  EUROPE_MOSCOW: 'Europe/Moscow',
  // Asia
  ASIA_TOKYO: 'Asia/Tokyo',
  ASIA_SHANGHAI: 'Asia/Shanghai',
  ASIA_SINGAPORE: 'Asia/Singapore',
  ASIA_DUBAI: 'Asia/Dubai',
  ASIA_KOLKATA: 'Asia/Kolkata',
  // Australia
  AUSTRALIA_SYDNEY: 'Australia/Sydney',
  AUSTRALIA_MELBOURNE: 'Australia/Melbourne',
} as const

/**
 * Create a schedule for every N minutes
 *
 * @param minutes - Number of minutes (1-59)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = everyMinutes(5)
 * // Runs every 5 minutes
 * ```
 */
export function everyMinutes(minutes: number, timezone?: string): CronSchedule {
  if (minutes < 1 || minutes > 59) {
    throw new Error('Minutes must be between 1 and 59')
  }

  return {
    pattern: `*/${minutes} * * * *`,
    tz: timezone,
  }
}

/**
 * Create a schedule for every N hours
 *
 * @param hours - Number of hours (1-23)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = everyHours(6)
 * // Runs every 6 hours
 * ```
 */
export function everyHours(hours: number, timezone?: string): CronSchedule {
  if (hours < 1 || hours > 23) {
    throw new Error('Hours must be between 1 and 23')
  }

  return {
    pattern: `0 */${hours} * * *`,
    tz: timezone,
  }
}

/**
 * Create a daily schedule at a specific time
 *
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = dailyAt(9, 30, Timezones.AMERICA_NEW_YORK)
 * // Runs daily at 9:30 AM New York time
 * ```
 */
export function dailyAt(
  hour: number,
  minute: number = 0,
  timezone?: string
): CronSchedule {
  if (hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23')
  }
  if (minute < 0 || minute > 59) {
    throw new Error('Minute must be between 0 and 59')
  }

  return {
    pattern: `${minute} ${hour} * * *`,
    tz: timezone,
  }
}

/**
 * Create a weekly schedule on specific days at a specific time
 *
 * @param daysOfWeek - Days of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = weeklyOn([1, 3, 5], 9, 0)
 * // Runs Monday, Wednesday, Friday at 9:00 AM
 * ```
 */
export function weeklyOn(
  daysOfWeek: number[],
  hour: number = 0,
  minute: number = 0,
  timezone?: string
): CronSchedule {
  if (hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23')
  }
  if (minute < 0 || minute > 59) {
    throw new Error('Minute must be between 0 and 59')
  }
  if (daysOfWeek.some(d => d < 0 || d > 6)) {
    throw new Error('Days of week must be between 0 (Sunday) and 6 (Saturday)')
  }

  const days = daysOfWeek.sort().join(',')

  return {
    pattern: `${minute} ${hour} * * ${days}`,
    tz: timezone,
  }
}

/**
 * Create a monthly schedule on a specific day at a specific time
 *
 * @param dayOfMonth - Day of month (1-31 or 'L' for last day)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = monthlyOn(1, 9, 0)
 * // Runs on the 1st of each month at 9:00 AM
 *
 * const endOfMonth = monthlyOn('L', 23, 59)
 * // Runs on the last day of each month at 11:59 PM
 * ```
 */
export function monthlyOn(
  dayOfMonth: number | 'L',
  hour: number = 0,
  minute: number = 0,
  timezone?: string
): CronSchedule {
  if (hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23')
  }
  if (minute < 0 || minute > 59) {
    throw new Error('Minute must be between 0 and 59')
  }
  if (typeof dayOfMonth === 'number' && (dayOfMonth < 1 || dayOfMonth > 31)) {
    throw new Error('Day of month must be between 1 and 31')
  }

  return {
    pattern: `${minute} ${hour} ${dayOfMonth} * *`,
    tz: timezone,
  }
}

/**
 * Create a yearly schedule on a specific date at a specific time
 *
 * @param month - Month (1-12)
 * @param dayOfMonth - Day of month (1-31)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = yearlyOn(12, 25, 9, 0)
 * // Runs on December 25th at 9:00 AM every year
 * ```
 */
export function yearlyOn(
  month: number,
  dayOfMonth: number,
  hour: number = 0,
  minute: number = 0,
  timezone?: string
): CronSchedule {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12')
  }
  if (dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error('Day of month must be between 1 and 31')
  }
  if (hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23')
  }
  if (minute < 0 || minute > 59) {
    throw new Error('Minute must be between 0 and 59')
  }

  return {
    pattern: `${minute} ${hour} ${dayOfMonth} ${month} *`,
    tz: timezone,
  }
}

/**
 * Create a schedule that runs on specific weekdays (Monday-Friday)
 *
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = weekdays(9, 0)
 * // Runs Monday-Friday at 9:00 AM
 * ```
 */
export function weekdays(
  hour: number = 0,
  minute: number = 0,
  timezone?: string
): CronSchedule {
  return weeklyOn([1, 2, 3, 4, 5], hour, minute, timezone)
}

/**
 * Create a schedule that runs on weekends (Saturday-Sunday)
 *
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param timezone - Optional timezone
 * @returns CronSchedule configuration
 *
 * @example
 * ```ts
 * const schedule = weekends(10, 0)
 * // Runs Saturday-Sunday at 10:00 AM
 * ```
 */
export function weekends(
  hour: number = 0,
  minute: number = 0,
  timezone?: string
): CronSchedule {
  return weeklyOn([0, 6], hour, minute, timezone)
}

/**
 * Validate a cron pattern
 *
 * @param pattern - Cron pattern to validate
 * @returns true if valid
 *
 * @example
 * ```ts
 * isValidCronPattern('0 9 * * *')    // true
 * isValidCronPattern('invalid')      // false
 * ```
 */
export function isValidCronPattern(pattern: string): boolean {
  // 5 fields (minute hour day month weekday) or 6 (seconds first), as BullMQ reads them
  const parts = pattern.trim().split(/\s+/)
  if (parts.length < 5 || parts.length > 6) return false
  // The parser BullMQ uses for repeatable jobs: names (MON, JAN), ?, L, ranges
  // and out-of-range values are judged exactly as BullMQ will
  try {
    cronParser.parseExpression(pattern.trim())
    return true
  } catch {
    return false
  }
}

/**
 * Parse a human-readable schedule string to cron pattern
 *
 * @param schedule - Human-readable schedule (e.g., "every 5 minutes", "daily at 9am")
 * @returns Cron pattern
 *
 * @example
 * ```ts
 * parseSchedule('every 5 minutes')
 * parseSchedule('daily at 9am')
 * parseSchedule('weekdays at 9:30am')
 * ```
 */
export function parseSchedule(schedule: string): string {
  const normalized = schedule.toLowerCase().trim()

  // Every N minutes/hours
  const everyMinutesMatch = normalized.match(/^every (\d+) minutes?$/)
  if (everyMinutesMatch) {
    return '*/' + everyMinutesMatch[1] + ' * * * *'
  }

  const everyHoursMatch = normalized.match(/^every (\d+) hours?$/)
  if (everyHoursMatch) {
    return '0 */' + everyHoursMatch[1] + ' * * *'
  }

  // Daily at HH:MM
  const dailyAtMatch = normalized.match(
    /^daily at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/
  )
  if (dailyAtMatch) {
    let hour = parseInt(dailyAtMatch[1])
    const minute = dailyAtMatch[2] ? parseInt(dailyAtMatch[2]) : 0
    const ampm = dailyAtMatch[3]

    if (ampm === 'pm' && hour !== 12) {
      hour += 12
    } else if (ampm === 'am' && hour === 12) {
      hour = 0
    }

    return `${minute} ${hour} * * *`
  }

  // Weekdays/weekends at HH:MM
  const weekdaysMatch = normalized.match(
    /^weekdays at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/
  )
  if (weekdaysMatch) {
    let hour = parseInt(weekdaysMatch[1])
    const minute = weekdaysMatch[2] ? parseInt(weekdaysMatch[2]) : 0
    const ampm = weekdaysMatch[3]

    if (ampm === 'pm' && hour !== 12) {
      hour += 12
    } else if (ampm === 'am' && hour === 12) {
      hour = 0
    }

    return `${minute} ${hour} * * 1-5`
  }

  const weekendsMatch = normalized.match(
    /^weekends at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/
  )
  if (weekendsMatch) {
    let hour = parseInt(weekendsMatch[1])
    const minute = weekendsMatch[2] ? parseInt(weekendsMatch[2]) : 0
    const ampm = weekendsMatch[3]

    if (ampm === 'pm' && hour !== 12) {
      hour += 12
    } else if (ampm === 'am' && hour === 12) {
      hour = 0
    }

    return `${minute} ${hour} * * 0,6`
  }

  // Common patterns
  const commonPatterns: Record<string, string> = {
    'every minute': '* * * * *',
    hourly: '0 * * * *',
    daily: '0 0 * * *',
    weekly: '0 0 * * 0',
    monthly: '0 0 1 * *',
    yearly: '0 0 1 1 *',
  }

  if (commonPatterns[normalized]) {
    return commonPatterns[normalized]
  }

  throw new Error(`Invalid schedule format: ${schedule}`)
}

/**
 * Format a cron pattern to human-readable string
 *
 * @param pattern - Cron pattern
 * @returns Human-readable description
 *
 * @example
 * ```ts
 * formatCronPattern('*_/5 * * * *')
 * formatCronPattern('0 9 * * 1-5')
 * ```
 */
export function formatCronPattern(pattern: string): string {
  const parts = pattern.trim().split(/\s+/)

  if (parts.length < 5) {
    return pattern
  }

  const [minute, hour, day, month, dayOfWeek] = parts

  // Simple patterns
  if (pattern === '* * * * *') return 'Every minute'
  if (pattern === '0 * * * *') return 'Every hour'
  if (pattern === '0 0 * * *') return 'Daily at midnight'
  if (pattern === '0 12 * * *') return 'Daily at noon'
  if (pattern === '0 0 * * 0') return 'Weekly on Sunday'
  if (pattern === '0 0 1 * *') return 'Monthly on the 1st'
  if (pattern === '0 0 1 1 *') return 'Yearly on January 1st'

  // Every N minutes/hours
  if (
    minute.startsWith('*/') &&
    hour === '*' &&
    day === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return `Every ${minute.slice(2)} minutes`
  }

  if (
    minute === '0' &&
    hour.startsWith('*/') &&
    day === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return `Every ${hour.slice(2)} hours`
  }

  // Daily at specific time
  if (day === '*' && month === '*' && dayOfWeek === '*') {
    const h = parseInt(hour)
    const m = parseInt(minute)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    const displayMinute = m.toString().padStart(2, '0')
    return `Daily at ${displayHour}:${displayMinute} ${ampm}`
  }

  // Weekdays
  if (day === '*' && month === '*' && dayOfWeek === '1-5') {
    const h = parseInt(hour)
    const m = parseInt(minute)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    const displayMinute = m.toString().padStart(2, '0')
    return `Weekdays at ${displayHour}:${displayMinute} ${ampm}`
  }

  return pattern
}
