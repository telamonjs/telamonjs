import { describe, it, expect } from 'vitest'
import { createDashboardRouter } from './server'
import type { QueueManager } from '../core/QueueManager'

/**
 * This suite previously imported a `createDashboardServer(queueManager, opts)`
 * function that never existed in server.ts (real exports are `startDashboard`
 * and `createDashboardRouter`, both taking a single config object - see
 * server.ts:8-40, 62, 160). `startDashboard` isn't covered here because it
 * calls `app.listen()` for real (server.ts:131) and doesn't expose the
 * resulting http.Server to close it again, so unit-testing it would leak an
 * open listener per test. `createDashboardRouter` builds an Express router
 * without binding a port, so it's safe to construct repeatedly in tests.
 */
function mockQueueManager(
  queues: Map<string, unknown> = new Map()
): QueueManager {
  return { queues } as unknown as QueueManager
}

describe('Dashboard Server', () => {
  describe('createDashboardRouter', () => {
    it('creates a router for an empty queue manager', () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
      })

      expect(router).toBeDefined()
    })

    it('applies a custom base path', () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        basePath: '/admin/queues',
      })

      expect(router).toBeDefined()
    })

    it('applies a custom title', () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        title: 'Custom Dashboard',
      })

      expect(router).toBeDefined()
    })

    it('defaults base path to "/" when not specified', () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
      })

      expect(router).toBeDefined()
    })

    it('handles an empty base path', () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        basePath: '',
      })

      expect(router).toBeDefined()
    })
  })
})
