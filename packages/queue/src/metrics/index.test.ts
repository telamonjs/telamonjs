import { describe, it, expect, vi } from 'vitest'
import { Registry } from 'prom-client'
import type { QueueManager } from '../core/QueueManager'

describe('@telamonjs/queue/metrics', () => {
  it('exports both collectors, each with a prom-client Registry', async () => {
    const { QueueMetrics, OptimizedQueueMetrics } = await import('./index')
    const qm = { getStats: vi.fn() } as unknown as QueueManager

    expect(new QueueMetrics(qm).getRegistry()).toBeInstanceOf(Registry)
    expect(new OptimizedQueueMetrics(qm).getRegistry()).toBeInstanceOf(Registry)
  })

  it('the root entry still re-exports them (deprecated)', async () => {
    const root = await import('../index')
    expect(root.QueueMetrics).toBeDefined()
    expect(root.OptimizedQueueMetrics).toBeDefined()
  })
})
