/**
 * The root barrel must load without chalk (ESM-only), so consumers that only
 * need NoOpLogger (e.g. @telamonjs/queue) never have to mock it.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('chalk', () => {
  throw new Error('chalk must not be loaded')
})

describe('barrel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('imports NoOpLogger without loading chalk', async () => {
    const { NoOpLogger } = await import('../../src/index')
    expect(new NoOpLogger().getLevel()).toBeDefined()
  })

  it('formats PrettyLogger output without loading chalk', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { PrettyLogger } = await import('../../src/index')
    new PrettyLogger().info('hello')
    expect(log.mock.calls[0][0]).toContain('hello')
  })
})
