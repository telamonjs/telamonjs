import { once } from 'node:events'
import { afterEach, describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createDashboardRouter, startDashboard } from './server'
import type { QueueManager } from '../core/QueueManager'
import { ConfigurationError } from '../utils/errors'

/**
 * `createDashboardRouter` builds an Express app without binding a port, so
 * it's safe to construct repeatedly. `startDashboard` binds for real; the
 * tests use port 0 and close the returned `server` afterwards.
 */
function mockQueueManager(
  queues: Map<string, unknown> = new Map()
): QueueManager {
  return { queues } as unknown as QueueManager
}

const AUTH = { enabled: true, username: 'admin', password: 's3cret' }

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

    it('handles an empty base path', () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        basePath: '',
      })

      expect(router).toBeDefined()
    })

    it('serves the board without credentials when auth is not enabled', async () => {
      const router = createDashboardRouter({ queueManager: mockQueueManager() })

      await request(router).get('/').expect(200)
    })

    it('answers 401 without credentials when auth is enabled', async () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        auth: AUTH,
      })

      const res = await request(router).get('/')

      expect(res.status).toBe(401)
      expect(res.headers['www-authenticate']).toMatch(/^Basic/)
    })

    it('answers 401 with wrong credentials', async () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        auth: AUTH,
      })

      await request(router).get('/').auth('admin', 'wrong').expect(401)
    })

    it('serves the board with valid credentials', async () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        auth: AUTH,
      })

      await request(router).get('/').auth('admin', 's3cret').expect(200)
    })

    it('protects a custom base path', async () => {
      const router = createDashboardRouter({
        queueManager: mockQueueManager(),
        basePath: '/admin/queues',
        auth: AUTH,
      })

      await request(router).get('/admin/queues').expect(401)
      await request(router).get('/admin/queues').auth('admin', 's3cret').expect(200)
    })

    it.each([
      ['an empty password', { enabled: true, username: 'admin', password: '' }],
      ['a missing password', { enabled: true, username: 'admin' }],
      ['a missing username', { enabled: true, password: 's3cret' }],
    ])('throws a ConfigurationError for auth.enabled with %s', (_label, auth) => {
      expect(() =>
        createDashboardRouter({ queueManager: mockQueueManager(), auth })
      ).toThrow(ConfigurationError)
    })
  })

  describe('startDashboard', () => {
    const closers: Array<() => Promise<void>> = []

    afterEach(async () => {
      vi.restoreAllMocks()
      await Promise.all(closers.splice(0).map(close => close()))
    })

    async function start(config: Parameters<typeof startDashboard>[0]) {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      const dashboard = startDashboard({ port: 0, ...config })
      closers.push(
        () => new Promise<void>(resolve => dashboard.server.close(() => resolve()))
      )
      if (!dashboard.server.listening) await once(dashboard.server, 'listening')
      return dashboard
    }

    it('returns the Express app with the listening HTTP server attached', async () => {
      const dashboard = await start({ queueManager: mockQueueManager() })

      expect(typeof dashboard.use).toBe('function')
      expect(dashboard.server.listening).toBe(true)
      await request(dashboard.server).get('/health').expect(200)
    })

    it('does not install a SIGTERM handler', async () => {
      const before = process.listenerCount('SIGTERM')

      await start({ queueManager: mockQueueManager() })

      expect(process.listenerCount('SIGTERM')).toBe(before)
    })

    it('enforces basic auth when enabled', async () => {
      const dashboard = await start({ queueManager: mockQueueManager(), auth: AUTH })

      await request(dashboard.server).get('/').expect(401)
      await request(dashboard.server).get('/').auth('admin', 's3cret').expect(200)
    })

    it('never logs the credentials', async () => {
      await start({ queueManager: mockQueueManager(), auth: AUTH })

      const logged = vi.mocked(console.log).mock.calls.flat().join(' ')
      expect(logged).not.toContain('admin')
      expect(logged).not.toContain('s3cret')
    })

    it('throws a ConfigurationError for auth.enabled without a password, before listening', () => {
      expect(() =>
        startDashboard({
          port: 0,
          queueManager: mockQueueManager(),
          auth: { enabled: true, username: 'admin', password: '' },
        })
      ).toThrow(ConfigurationError)
    })
  })
})
