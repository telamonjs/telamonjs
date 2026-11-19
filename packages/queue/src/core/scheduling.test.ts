import { describe, it, expect } from 'vitest'
import {
  SchedulePatterns,
  Timezones,
  everyMinutes,
  everyHours,
  dailyAt,
  weeklyOn,
  monthlyOn,
  yearlyOn,
  weekdays,
  weekends,
  isValidCronPattern,
  parseSchedule,
  formatCronPattern,
} from './scheduling'

describe('Scheduling', () => {
  describe('SchedulePatterns', () => {
    it('should have common patterns', () => {
      expect(SchedulePatterns.EVERY_MINUTE).toBe('* * * * *')
      expect(SchedulePatterns.EVERY_5_MINUTES).toBe('*/5 * * * *')
      expect(SchedulePatterns.EVERY_HOUR).toBe('0 * * * *')
      expect(SchedulePatterns.DAILY_AT_MIDNIGHT).toBe('0 0 * * *')
      expect(SchedulePatterns.DAILY_AT_NOON).toBe('0 12 * * *')
      expect(SchedulePatterns.WEEKLY_MONDAY).toBe('0 0 * * 1')
      expect(SchedulePatterns.MONTHLY_FIRST).toBe('0 0 1 * *')
      expect(SchedulePatterns.YEARLY).toBe('0 0 1 1 *')
    })
  })

  describe('Timezones', () => {
    it('should have common timezones', () => {
      expect(Timezones.UTC).toBe('UTC')
      expect(Timezones.AMERICA_NEW_YORK).toBe('America/New_York')
      expect(Timezones.AMERICA_SAO_PAULO).toBe('America/Sao_Paulo')
      expect(Timezones.EUROPE_LONDON).toBe('Europe/London')
      expect(Timezones.ASIA_TOKYO).toBe('Asia/Tokyo')
    })
  })

  describe('everyMinutes()', () => {
    it('should create schedule for every N minutes', () => {
      const schedule = everyMinutes(5)
      expect(schedule.pattern).toBe('*/5 * * * *')
      expect(schedule.tz).toBeUndefined()
    })

    it('should support timezone', () => {
      const schedule = everyMinutes(10, Timezones.AMERICA_NEW_YORK)
      expect(schedule.pattern).toBe('*/10 * * * *')
      expect(schedule.tz).toBe('America/New_York')
    })

    it('should throw for invalid minutes', () => {
      expect(() => everyMinutes(0)).toThrow('Minutes must be between 1 and 59')
      expect(() => everyMinutes(60)).toThrow('Minutes must be between 1 and 59')
    })
  })

  describe('everyHours()', () => {
    it('should create schedule for every N hours', () => {
      const schedule = everyHours(6)
      expect(schedule.pattern).toBe('0 */6 * * *')
    })

    it('should throw for invalid hours', () => {
      expect(() => everyHours(0)).toThrow('Hours must be between 1 and 23')
      expect(() => everyHours(24)).toThrow('Hours must be between 1 and 23')
    })
  })

  describe('dailyAt()', () => {
    it('should create daily schedule at specific time', () => {
      const schedule = dailyAt(9, 30)
      expect(schedule.pattern).toBe('30 9 * * *')
    })

    it('should default minute to 0', () => {
      const schedule = dailyAt(9)
      expect(schedule.pattern).toBe('0 9 * * *')
    })

    it('should support timezone', () => {
      const schedule = dailyAt(9, 30, Timezones.AMERICA_NEW_YORK)
      expect(schedule.tz).toBe('America/New_York')
    })

    it('should throw for invalid hour', () => {
      expect(() => dailyAt(-1)).toThrow('Hour must be between 0 and 23')
      expect(() => dailyAt(24)).toThrow('Hour must be between 0 and 23')
    })

    it('should throw for invalid minute', () => {
      expect(() => dailyAt(9, -1)).toThrow('Minute must be between 0 and 59')
      expect(() => dailyAt(9, 60)).toThrow('Minute must be between 0 and 59')
    })
  })

  describe('weeklyOn()', () => {
    it('should create weekly schedule for specific days', () => {
      const schedule = weeklyOn([1, 3, 5], 9, 0)
      expect(schedule.pattern).toBe('0 9 * * 1,3,5')
    })

    it('should sort days', () => {
      const schedule = weeklyOn([5, 1, 3], 9, 0)
      expect(schedule.pattern).toBe('0 9 * * 1,3,5')
    })

    it('should throw for invalid days', () => {
      expect(() => weeklyOn([-1], 9, 0)).toThrow(
        'Days of week must be between 0 (Sunday) and 6 (Saturday)'
      )
      expect(() => weeklyOn([7], 9, 0)).toThrow(
        'Days of week must be between 0 (Sunday) and 6 (Saturday)'
      )
    })
  })

  describe('monthlyOn()', () => {
    it('should create monthly schedule on specific day', () => {
      const schedule = monthlyOn(15, 9, 30)
      expect(schedule.pattern).toBe('30 9 15 * *')
    })

    it('should support last day of month', () => {
      const schedule = monthlyOn('L', 23, 59)
      expect(schedule.pattern).toBe('59 23 L * *')
    })

    it('should throw for invalid day', () => {
      expect(() => monthlyOn(0, 9, 0)).toThrow(
        'Day of month must be between 1 and 31'
      )
      expect(() => monthlyOn(32, 9, 0)).toThrow(
        'Day of month must be between 1 and 31'
      )
    })
  })

  describe('yearlyOn()', () => {
    it('should create yearly schedule on specific date', () => {
      const schedule = yearlyOn(12, 25, 9, 0)
      expect(schedule.pattern).toBe('0 9 25 12 *')
    })

    it('should throw for invalid month', () => {
      expect(() => yearlyOn(0, 1, 9, 0)).toThrow(
        'Month must be between 1 and 12'
      )
      expect(() => yearlyOn(13, 1, 9, 0)).toThrow(
        'Month must be between 1 and 12'
      )
    })
  })

  describe('weekdays()', () => {
    it('should create schedule for weekdays', () => {
      const schedule = weekdays(9, 0)
      expect(schedule.pattern).toBe('0 9 * * 1,2,3,4,5')
    })
  })

  describe('weekends()', () => {
    it('should create schedule for weekends', () => {
      const schedule = weekends(10, 0)
      expect(schedule.pattern).toBe('0 10 * * 0,6')
    })
  })

  describe('isValidCronPattern()', () => {
    it('should validate correct patterns', () => {
      expect(isValidCronPattern('* * * * *')).toBe(true)
      expect(isValidCronPattern('0 9 * * *')).toBe(true)
      expect(isValidCronPattern('*/5 * * * *')).toBe(true)
      expect(isValidCronPattern('0 9 * * 1-5')).toBe(true)
      expect(isValidCronPattern('0 0 1 * *')).toBe(true)
    })

    it('should reject invalid patterns', () => {
      expect(isValidCronPattern('invalid')).toBe(false)
      expect(isValidCronPattern('* * *')).toBe(false)
      expect(isValidCronPattern('60 25 * * *')).toBe(false)
      expect(isValidCronPattern('')).toBe(false)
    })
  })

  describe('parseSchedule()', () => {
    it('should parse "every N minutes"', () => {
      expect(parseSchedule('every 5 minutes')).toBe('*/5 * * * *')
      expect(parseSchedule('every 10 minute')).toBe('*/10 * * * *')
    })

    it('should parse "every N hours"', () => {
      expect(parseSchedule('every 2 hours')).toBe('0 */2 * * *')
      expect(parseSchedule('every 6 hour')).toBe('0 */6 * * *')
    })

    it('should parse "daily at HH:MM"', () => {
      expect(parseSchedule('daily at 9')).toBe('0 9 * * *')
      expect(parseSchedule('daily at 9:30')).toBe('30 9 * * *')
      expect(parseSchedule('daily at 9am')).toBe('0 9 * * *')
      expect(parseSchedule('daily at 9:30am')).toBe('30 9 * * *')
      expect(parseSchedule('daily at 2pm')).toBe('0 14 * * *')
      expect(parseSchedule('daily at 2:30pm')).toBe('30 14 * * *')
    })

    it('should handle 12am/12pm correctly', () => {
      expect(parseSchedule('daily at 12am')).toBe('0 0 * * *')
      expect(parseSchedule('daily at 12pm')).toBe('0 12 * * *')
    })

    it('should parse "weekdays at HH:MM"', () => {
      expect(parseSchedule('weekdays at 9')).toBe('0 9 * * 1-5')
      expect(parseSchedule('weekdays at 9:30am')).toBe('30 9 * * 1-5')
    })

    it('should parse "weekends at HH:MM"', () => {
      expect(parseSchedule('weekends at 10')).toBe('0 10 * * 0,6')
      expect(parseSchedule('weekends at 10:30am')).toBe('30 10 * * 0,6')
    })

    it('should parse common patterns', () => {
      expect(parseSchedule('every minute')).toBe('* * * * *')
      expect(parseSchedule('hourly')).toBe('0 * * * *')
      expect(parseSchedule('daily')).toBe('0 0 * * *')
      expect(parseSchedule('weekly')).toBe('0 0 * * 0')
      expect(parseSchedule('monthly')).toBe('0 0 1 * *')
      expect(parseSchedule('yearly')).toBe('0 0 1 1 *')
    })

    it('should throw for invalid format', () => {
      expect(() => parseSchedule('invalid format')).toThrow(
        'Invalid schedule format'
      )
    })
  })

  describe('formatCronPattern()', () => {
    it('should format common patterns', () => {
      expect(formatCronPattern('* * * * *')).toBe('Every minute')
      expect(formatCronPattern('0 * * * *')).toBe('Every hour')
      expect(formatCronPattern('0 0 * * *')).toBe('Daily at midnight')
      expect(formatCronPattern('0 12 * * *')).toBe('Daily at noon')
      expect(formatCronPattern('0 0 * * 0')).toBe('Weekly on Sunday')
      expect(formatCronPattern('0 0 1 * *')).toBe('Monthly on the 1st')
      expect(formatCronPattern('0 0 1 1 *')).toBe('Yearly on January 1st')
    })

    it('should format every N minutes', () => {
      expect(formatCronPattern('*/5 * * * *')).toBe('Every 5 minutes')
      expect(formatCronPattern('*/10 * * * *')).toBe('Every 10 minutes')
    })

    it('should format every N hours', () => {
      expect(formatCronPattern('0 */2 * * *')).toBe('Every 2 hours')
      expect(formatCronPattern('0 */6 * * *')).toBe('Every 6 hours')
    })

    it('should format daily at specific time', () => {
      expect(formatCronPattern('0 9 * * *')).toBe('Daily at 9:00 AM')
      expect(formatCronPattern('30 9 * * *')).toBe('Daily at 9:30 AM')
      expect(formatCronPattern('0 14 * * *')).toBe('Daily at 2:00 PM')
      expect(formatCronPattern('30 14 * * *')).toBe('Daily at 2:30 PM')
    })

    it('should format weekdays', () => {
      expect(formatCronPattern('0 9 * * 1-5')).toBe('Weekdays at 9:00 AM')
      expect(formatCronPattern('30 14 * * 1-5')).toBe('Weekdays at 2:30 PM')
    })

    it('should return pattern if not recognized', () => {
      expect(formatCronPattern('15 9 * * 2,4')).toBe('15 9 * * 2,4')
    })
  })
})
