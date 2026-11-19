import { describe, it, expect } from 'vitest'
import {
  JobPriority,
  PRIORITY_NAMES,
  PRIORITY_DESCRIPTIONS,
  getPriorityName,
  getPriorityDescription,
  isHigherPriority,
  getHighestPriority,
  getLowestPriority,
  isValidPriority,
  clampPriority,
  sortByPriority,
  groupByPriority,
  getPriorityDistribution,
  suggestPriority,
} from './priorities'

describe('JobPriority', () => {
  describe('Enum Values', () => {
    it('should have correct numeric values', () => {
      expect(JobPriority.CRITICAL).toBe(1)
      expect(JobPriority.HIGH).toBe(3)
      expect(JobPriority.NORMAL).toBe(5)
      expect(JobPriority.LOW).toBe(8)
      expect(JobPriority.DEFERRED).toBe(10)
    })

    it('should have all priority levels defined', () => {
      const priorities = Object.values(JobPriority).filter(
        p => typeof p === 'number'
      )
      expect(priorities).toHaveLength(5)
    })
  })

  describe('PRIORITY_NAMES', () => {
    it('should have names for all priority levels', () => {
      expect(PRIORITY_NAMES[JobPriority.CRITICAL]).toBe('Critical')
      expect(PRIORITY_NAMES[JobPriority.HIGH]).toBe('High')
      expect(PRIORITY_NAMES[JobPriority.NORMAL]).toBe('Normal')
      expect(PRIORITY_NAMES[JobPriority.LOW]).toBe('Low')
      expect(PRIORITY_NAMES[JobPriority.DEFERRED]).toBe('Deferred')
    })
  })

  describe('PRIORITY_DESCRIPTIONS', () => {
    it('should have descriptions for all priority levels', () => {
      expect(PRIORITY_DESCRIPTIONS[JobPriority.CRITICAL]).toContain(
        'immediately'
      )
      expect(PRIORITY_DESCRIPTIONS[JobPriority.HIGH]).toContain('user-facing')
      expect(PRIORITY_DESCRIPTIONS[JobPriority.NORMAL]).toContain('Default')
      expect(PRIORITY_DESCRIPTIONS[JobPriority.LOW]).toContain('capacity')
      expect(PRIORITY_DESCRIPTIONS[JobPriority.DEFERRED]).toContain('Lowest')
    })
  })

  describe('getPriorityName()', () => {
    it('should return correct names for exact priority values', () => {
      expect(getPriorityName(JobPriority.CRITICAL)).toBe('Critical')
      expect(getPriorityName(1)).toBe('Critical')
      expect(getPriorityName(3)).toBe('High')
      expect(getPriorityName(5)).toBe('Normal')
      expect(getPriorityName(8)).toBe('Low')
      expect(getPriorityName(10)).toBe('Deferred')
    })

    it('should return closest priority name for non-exact values', () => {
      expect(getPriorityName(2)).toBe('Critical') // Closer to 1 than 3
      expect(getPriorityName(4)).toBe('High') // Closer to 3 than 5
      expect(getPriorityName(6)).toBe('Normal') // Closer to 5 than 8
      expect(getPriorityName(9)).toBe('Low') // Equal distance to 8 and 10, returns first (8)
    })

    it('should handle edge cases', () => {
      expect(getPriorityName(0)).toBe('Critical') // Closer to 1
      expect(getPriorityName(15)).toBe('Deferred') // Closer to 10
    })
  })

  describe('getPriorityDescription()', () => {
    it('should return correct descriptions for exact priority values', () => {
      expect(getPriorityDescription(JobPriority.CRITICAL)).toContain(
        'immediately'
      )
      expect(getPriorityDescription(JobPriority.HIGH)).toContain('user-facing')
      expect(getPriorityDescription(JobPriority.NORMAL)).toContain('Default')
    })

    it('should return closest priority description for non-exact values', () => {
      expect(getPriorityDescription(2)).toContain('immediately') // Closer to CRITICAL
      expect(getPriorityDescription(7)).toContain('capacity') // Closer to LOW
    })
  })

  describe('isHigherPriority()', () => {
    it('should return true when first priority is higher (lower number)', () => {
      expect(isHigherPriority(JobPriority.CRITICAL, JobPriority.NORMAL)).toBe(
        true
      )
      expect(isHigherPriority(JobPriority.HIGH, JobPriority.LOW)).toBe(true)
      expect(isHigherPriority(1, 5)).toBe(true)
    })

    it('should return false when first priority is lower (higher number)', () => {
      expect(isHigherPriority(JobPriority.NORMAL, JobPriority.CRITICAL)).toBe(
        false
      )
      expect(isHigherPriority(JobPriority.LOW, JobPriority.HIGH)).toBe(false)
      expect(isHigherPriority(5, 1)).toBe(false)
    })

    it('should return false when priorities are equal', () => {
      expect(isHigherPriority(JobPriority.NORMAL, JobPriority.NORMAL)).toBe(
        false
      )
      expect(isHigherPriority(5, 5)).toBe(false)
    })
  })

  describe('getHighestPriority()', () => {
    it('should return the highest priority (lowest number)', () => {
      expect(getHighestPriority([5, 1, 8, 3])).toBe(1)
      expect(
        getHighestPriority([
          JobPriority.NORMAL,
          JobPriority.CRITICAL,
          JobPriority.LOW,
        ])
      ).toBe(JobPriority.CRITICAL)
    })

    it('should return NORMAL for empty array', () => {
      expect(getHighestPriority([])).toBe(JobPriority.NORMAL)
    })

    it('should handle single element', () => {
      expect(getHighestPriority([JobPriority.HIGH])).toBe(JobPriority.HIGH)
    })
  })

  describe('getLowestPriority()', () => {
    it('should return the lowest priority (highest number)', () => {
      expect(getLowestPriority([5, 1, 8, 3])).toBe(8)
      expect(
        getLowestPriority([
          JobPriority.NORMAL,
          JobPriority.CRITICAL,
          JobPriority.LOW,
        ])
      ).toBe(JobPriority.LOW)
    })

    it('should return NORMAL for empty array', () => {
      expect(getLowestPriority([])).toBe(JobPriority.NORMAL)
    })

    it('should handle single element', () => {
      expect(getLowestPriority([JobPriority.HIGH])).toBe(JobPriority.HIGH)
    })
  })

  describe('isValidPriority()', () => {
    it('should return true for valid priorities (1-10)', () => {
      expect(isValidPriority(1)).toBe(true)
      expect(isValidPriority(5)).toBe(true)
      expect(isValidPriority(10)).toBe(true)
    })

    it('should return false for invalid priorities', () => {
      expect(isValidPriority(0)).toBe(false)
      expect(isValidPriority(11)).toBe(false)
      expect(isValidPriority(-1)).toBe(false)
      expect(isValidPriority(100)).toBe(false)
    })

    it('should return false for non-integer values', () => {
      expect(isValidPriority(5.5)).toBe(false)
      expect(isValidPriority(1.1)).toBe(false)
    })
  })

  describe('clampPriority()', () => {
    it('should clamp values below 1 to 1', () => {
      expect(clampPriority(0)).toBe(1)
      expect(clampPriority(-5)).toBe(1)
    })

    it('should clamp values above 10 to 10', () => {
      expect(clampPriority(11)).toBe(10)
      expect(clampPriority(100)).toBe(10)
    })

    it('should keep valid values unchanged', () => {
      expect(clampPriority(1)).toBe(1)
      expect(clampPriority(5)).toBe(5)
      expect(clampPriority(10)).toBe(10)
    })

    it('should round decimal values', () => {
      expect(clampPriority(5.4)).toBe(5)
      expect(clampPriority(5.6)).toBe(6)
    })
  })

  describe('sortByPriority()', () => {
    it('should sort jobs by priority (highest first)', () => {
      const jobs = [
        { id: '1', priority: 5 },
        { id: '2', priority: 1 },
        { id: '3', priority: 8 },
        { id: '4', priority: 3 },
      ]

      const sorted = sortByPriority(jobs)

      expect(sorted[0].id).toBe('2') // priority 1
      expect(sorted[1].id).toBe('4') // priority 3
      expect(sorted[2].id).toBe('1') // priority 5
      expect(sorted[3].id).toBe('3') // priority 8
    })

    it('should use NORMAL priority for jobs without priority', () => {
      const jobs = [
        { id: '1' },
        { id: '2', priority: 1 },
        { id: '3', priority: 8 },
      ]

      const sorted = sortByPriority(jobs)

      expect(sorted[0].id).toBe('2') // priority 1
      expect(sorted[1].id).toBe('1') // priority 5 (default NORMAL)
      expect(sorted[2].id).toBe('3') // priority 8
    })

    it('should not mutate original array', () => {
      const jobs = [
        { id: '1', priority: 5 },
        { id: '2', priority: 1 },
      ]

      const originalOrder = [...jobs]
      sortByPriority(jobs)

      expect(jobs).toEqual(originalOrder)
    })

    it('should handle empty array', () => {
      const sorted = sortByPriority([])
      expect(sorted).toEqual([])
    })
  })

  describe('groupByPriority()', () => {
    it('should group jobs by priority level', () => {
      const jobs = [
        { id: '1', priority: 1 },
        { id: '2', priority: 3 },
        { id: '3', priority: 1 },
        { id: '4', priority: 5 },
      ]

      const grouped = groupByPriority(jobs)

      expect(grouped[1]).toHaveLength(2)
      expect(grouped[1]).toEqual([
        { id: '1', priority: 1 },
        { id: '3', priority: 1 },
      ])
      expect(grouped[3]).toHaveLength(1)
      expect(grouped[3][0].id).toBe('2')
      expect(grouped[5]).toHaveLength(1)
      expect(grouped[5][0].id).toBe('4')
    })

    it('should use NORMAL priority for jobs without priority', () => {
      const jobs = [{ id: '1' }, { id: '2', priority: 1 }, { id: '3' }]

      const grouped = groupByPriority(jobs)

      expect(grouped[5]).toHaveLength(2) // NORMAL = 5
      expect(grouped[1]).toHaveLength(1)
    })

    it('should handle empty array', () => {
      const grouped = groupByPriority([])
      expect(grouped).toEqual({})
    })
  })

  describe('getPriorityDistribution()', () => {
    it('should calculate distribution stats', () => {
      const jobs = [
        { priority: 1 },
        { priority: 1 },
        { priority: 5 },
        { priority: 8 },
      ]

      const distribution = getPriorityDistribution(jobs)

      expect(distribution.total).toBe(4)
      expect(distribution.byLevel[1].count).toBe(2)
      expect(distribution.byLevel[1].percentage).toBe(50)
      expect(distribution.byLevel[5].count).toBe(1)
      expect(distribution.byLevel[5].percentage).toBe(25)
      expect(distribution.byLevel[8].count).toBe(1)
      expect(distribution.byLevel[8].percentage).toBe(25)
      expect(distribution.averagePriority).toBe(3.75) // (1+1+5+8)/4 = 3.75
    })

    it('should handle jobs without priority', () => {
      const jobs = [{ priority: 1 }, {}, { priority: 1 }]

      const distribution = getPriorityDistribution(jobs)

      expect(distribution.total).toBe(3)
      expect(distribution.byLevel[1].count).toBe(2)
      expect(distribution.byLevel[5].count).toBe(1) // NORMAL = 5
    })

    it('should handle empty array', () => {
      const distribution = getPriorityDistribution([])

      expect(distribution.total).toBe(0)
      expect(distribution.byLevel).toEqual({})
      expect(distribution.averagePriority).toBe(JobPriority.NORMAL)
    })

    it('should calculate percentages correctly', () => {
      const jobs = [
        { priority: 1 },
        { priority: 1 },
        { priority: 1 },
        { priority: 5 },
      ]

      const distribution = getPriorityDistribution(jobs)

      expect(distribution.byLevel[1].percentage).toBe(75)
      expect(distribution.byLevel[5].percentage).toBe(25)
    })
  })

  describe('suggestPriority()', () => {
    it('should suggest CRITICAL for critical jobs', () => {
      expect(suggestPriority({ critical: true })).toBe(JobPriority.CRITICAL)
    })

    it('should suggest CRITICAL for user-facing with tight timeout', () => {
      expect(suggestPriority({ userFacing: true, timeoutMs: 3000 })).toBe(
        JobPriority.CRITICAL
      )
    })

    it('should suggest HIGH for user-facing jobs', () => {
      expect(suggestPriority({ userFacing: true })).toBe(JobPriority.HIGH)
      expect(suggestPriority({ userFacing: true, timeoutMs: 10000 })).toBe(
        JobPriority.HIGH
      )
    })

    it('should suggest LOW for batch jobs', () => {
      expect(suggestPriority({ batch: true })).toBe(JobPriority.LOW)
    })

    it('should suggest LOW for cleanup jobs', () => {
      expect(suggestPriority({ cleanup: true })).toBe(JobPriority.LOW)
    })

    it('should suggest NORMAL by default', () => {
      expect(suggestPriority({})).toBe(JobPriority.NORMAL)
    })

    it('should prioritize critical over other characteristics', () => {
      expect(
        suggestPriority({
          critical: true,
          batch: true,
          cleanup: true,
        })
      ).toBe(JobPriority.CRITICAL)
    })

    it('should prioritize user-facing over batch/cleanup', () => {
      expect(
        suggestPriority({
          userFacing: true,
          batch: true,
        })
      ).toBe(JobPriority.HIGH)
    })
  })
})
