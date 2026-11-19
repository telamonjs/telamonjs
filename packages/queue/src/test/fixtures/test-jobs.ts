/**
 * Test job fixtures
 * Reusable job classes for testing
 */

import { Job } from '../../core/Job.js'

// ============================================================================
// Basic Jobs
// ============================================================================

export interface SimpleData {
  message: string
}

export class SimpleJob extends Job<SimpleData, string> {
  name = 'simple-job' as const

  async process(data: SimpleData): Promise<string> {
    return `Processed: ${data.message}`
  }
}

// ============================================================================
// Job with Options
// ============================================================================

export class JobWithOptions extends Job<{ value: number }, number> {
  name = 'job-with-options' as const

  options = {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    timeout: 10000,
    removeOnComplete: 50,
    removeOnFail: 200,
  }

  async process(data: { value: number }): Promise<number> {
    return data.value * 2
  }
}

// ============================================================================
// Job with Hooks
// ============================================================================

export class JobWithHooks extends Job<{ id: string }, void> {
  name = 'job-with-hooks' as const

  onActiveCalled = false
  onCompletedCalled = false
  onFailedCalled = false
  onProgressCalled = false

  async onActive(_data: { id: string }): Promise<void> {
    this.onActiveCalled = true
  }

  async onCompleted(_result: void): Promise<void> {
    this.onCompletedCalled = true
  }

  async onFailed(_error: Error): Promise<void> {
    this.onFailedCalled = true
  }

  async onProgress(_progress: number | object): Promise<void> {
    this.onProgressCalled = true
  }

  async process(_data: { id: string }): Promise<void> {
    // Do nothing
  }
}

// ============================================================================
// Job that Fails
// ============================================================================

export class FailingJob extends Job<{ shouldFail: boolean }, void> {
  name = 'failing-job' as const

  async process(data: { shouldFail: boolean }): Promise<void> {
    if (data.shouldFail) {
      throw new Error('Job intentionally failed')
    }
  }
}

// ============================================================================
// Job with Validation
// ============================================================================

export class JobWithValidation extends Job<{ email: string }, void> {
  name = 'job-with-validation' as const

  async validate(data: { email: string }): Promise<void> {
    if (!data.email || !data.email.includes('@')) {
      throw new Error('Invalid email address')
    }
  }

  async process(_data: { email: string }): Promise<void> {
    // Process valid email
  }
}

// ============================================================================
// Job with Transform
// ============================================================================

export class JobWithTransform extends Job<{ text: string }, string> {
  name = 'job-with-transform' as const

  async transform(data: { text: string }): Promise<{ text: string }> {
    return {
      text: data.text.toUpperCase(),
    }
  }

  async process(data: { text: string }): Promise<string> {
    return data.text // Should be uppercase from transform
  }
}

// ============================================================================
// Slow Job (for timeout tests)
// ============================================================================

export class SlowJob extends Job<{ delayMs: number }, void> {
  name = 'slow-job' as const

  options = {
    timeout: 1000, // 1 second timeout
  }

  async process(data: { delayMs: number }): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, data.delayMs))
  }
}

// ============================================================================
// Job with Priority
// ============================================================================

export class PriorityJob extends Job<{ priority: number }, void> {
  name = 'priority-job' as const

  async process(_data: { priority: number }): Promise<void> {
    // Process with priority
  }
}

// ============================================================================
// Job with configDefaults (job-config bootstrap seeds)
// ============================================================================

export class JobWithConfigDefaults extends Job<void, void> {
  name = 'job-with-config-defaults' as const

  configDefaults = {
    cronPattern: '0 9 * * *',
    enabled: true,
    priority: 3,
    concurrency: 2,
    description: 'Seeded via Job.configDefaults',
  }

  async process(): Promise<void> {
    // No-op
  }
}

// ============================================================================
// Job still declaring the removed `schedule` field (guard tests)
// ============================================================================

export class JobWithLegacySchedule extends Job<void, void> {
  name = 'job-with-legacy-schedule' as const
  schedule = '*/5 * * * *'

  async process(): Promise<void> {
    // No-op
  }
}
