/**
 * Global test setup
 * Runs once before all tests
 */

import { beforeAll, afterAll } from 'vitest'

// Suppress console logs during tests (optional)
const originalConsoleLog = console.log
const originalConsoleError = console.error

beforeAll(() => {
  // Optionally suppress logs in tests
  if (process.env.SUPPRESS_LOGS === 'true') {
    console.log = () => {}
    console.error = () => {}
  }
})

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog
  console.error = originalConsoleError
})

// Set test environment variables
process.env.NODE_ENV = 'test'
// Redis address: see TEST_REDIS in ./redis-availability.ts

// ioredis >=5.11: closing a connection rejects IN-FLIGHT commands with
// "Connection is closed." — a benign socket race during test teardown that
// surfaces as an unhandled rejection from whichever suite closed last
// (observed from EventEmitter, QueueManager, JobConfigStore and
// DeadLetterQueue tests). Swallow EXACTLY that signature; anything else is
// re-thrown so real bugs still fail the run.
process.on('unhandledRejection', reason => {
  const msg = reason instanceof Error ? reason.message : String(reason)
  if (msg === 'Connection is closed.') return
  throw reason
})
