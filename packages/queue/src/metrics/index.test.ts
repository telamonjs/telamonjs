import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'node:module'
import type { QueueManager } from '../core/QueueManager'

// Any static `import ... from 'prom-client'` in the module graph now throws.
// The metrics classes load it through `createRequire` on construction, which
// bypasses this mock and gets the real package.
vi.mock('prom-client', () => {
  throw new Error('prom-client was loaded at import time')
})

describe('prom-client stays out of import time', () => {
  it('the root entry imports without loading prom-client', async () => {
    const root = await import('../index')
    expect(root.QueueManager).toBeDefined()
    expect(root.QueueMetrics).toBeDefined()
  })

  it('./monitoring health and Redis helpers import without prom-client', async () => {
    const monitoring = await import('../monitoring/index')
    expect(monitoring.performHealthCheck).toBeDefined()
    expect(monitoring.getRedisConnectionMetrics).toBeDefined()
  })

  it('./metrics imports without prom-client and loads it on construction', async () => {
    const { QueueMetrics, OptimizedQueueMetrics } = await import('./index')
    const qm = { getStats: vi.fn() } as unknown as QueueManager
    const { Registry } = createRequire(import.meta.url)(
      'prom-client'
    ) as typeof import('prom-client')

    expect(new QueueMetrics(qm).getRegistry()).toBeInstanceOf(Registry)
    expect(new OptimizedQueueMetrics(qm).getRegistry()).toBeInstanceOf(Registry)
  })
})
