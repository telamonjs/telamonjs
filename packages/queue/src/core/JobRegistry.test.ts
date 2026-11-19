/**
 * Unit tests for JobRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { JobRegistry } from './JobRegistry'
import { SimpleJob, JobWithOptions, PriorityJob } from '../test/fixtures/test-jobs'

describe('JobRegistry', () => {
  let registry: JobRegistry

  beforeEach(() => {
    // Get singleton instance and clear it
    registry = JobRegistry.getInstance()
    registry['jobs'].clear() // Access private property for testing
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = JobRegistry.getInstance()
      const instance2 = JobRegistry.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('register()', () => {
    it('should register a job class', () => {
      registry.register(SimpleJob)

      expect(registry.has('simple-job')).toBe(true)
    })

    it('should store job instance', () => {
      registry.register(SimpleJob)

      const job = registry.get('simple-job')
      expect(job).toBeInstanceOf(SimpleJob)
      expect(job?.name).toBe('simple-job')
    })

    it('should not allow duplicate registrations', () => {
      registry.register(SimpleJob)

      expect(() => {
        registry.register(SimpleJob)
      }).toThrow('already registered')
    })

    it('should register multiple jobs', () => {
      registry.register(SimpleJob)
      registry.register(JobWithOptions)

      expect(registry.has('simple-job')).toBe(true)
      expect(registry.has('job-with-options')).toBe(true)
    })
  })

  describe('get()', () => {
    it('should return job by name', () => {
      registry.register(SimpleJob)

      const job = registry.get('simple-job')
      expect(job).toBeInstanceOf(SimpleJob)
    })

    it('should return undefined for non-existent job', () => {
      const job = registry.get('non-existent')
      expect(job).toBeUndefined()
    })
  })

  describe('has()', () => {
    it('should return true for registered job', () => {
      registry.register(SimpleJob)

      expect(registry.has('simple-job')).toBe(true)
    })

    it('should return false for non-registered job', () => {
      expect(registry.has('non-existent')).toBe(false)
    })
  })

  describe('getNames()', () => {
    it('should return empty array when no jobs registered', () => {
      expect(registry.getNames()).toEqual([])
    })

    it('should return all registered job names', () => {
      registry.register(SimpleJob)
      registry.register(JobWithOptions)
      registry.register(PriorityJob)

      const names = registry.getNames()
      expect(names).toEqual(['simple-job', 'job-with-options', 'priority-job'])
    })
  })

  describe('getStats()', () => {
    it('should return correct stats', () => {
      registry.register(SimpleJob)
      registry.register(JobWithOptions)

      const stats = registry.getStats()
      expect(stats).toEqual({
        total: 2,
        jobs: ['simple-job', 'job-with-options'],
      })
    })

    it('should return zero stats when empty', () => {
      const stats = registry.getStats()
      expect(stats).toEqual({
        total: 0,
        jobs: [],
      })
    })
  })

  describe('validate()', () => {
    it('should pass validation when jobs are registered', () => {
      registry.register(SimpleJob)

      expect(() => {
        registry.validate()
      }).not.toThrow()
    })

    it('should throw when no jobs registered', () => {
      expect(() => {
        registry.validate()
      }).toThrow('No jobs registered')
    })

    it('should throw for jobs without name', () => {
      class InvalidJob extends SimpleJob {
        name = '' // Empty name
      }

      expect(() => {
        registry.register(InvalidJob)
      }).toThrow('Job name cannot be empty')
    })

    it('should throw for jobs without process method', () => {
      class InvalidJob extends SimpleJob {
        process = undefined as unknown as SimpleJob['process']
      }

      registry.register(InvalidJob)

      expect(() => {
        registry.validate()
      }).toThrow('must implement process')
    })
  })

  describe('clear() - for testing', () => {
    it('should clear all jobs', () => {
      registry.register(SimpleJob)
      registry.register(JobWithOptions)

      registry['jobs'].clear()

      expect(registry.getNames()).toEqual([])
    })
  })
})
