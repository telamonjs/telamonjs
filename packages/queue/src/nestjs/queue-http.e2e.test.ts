import 'reflect-metadata'
import * as http from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import type { Request } from 'express'
import { createPermissionsGuard } from '@telamonjs/permissions/nest'
import { QueueHttpModule } from './queue-http.module.js'
import {
  makeDeps,
  makeQueueSource,
  makeContracts,
  makeQueue,
  makeBullJob,
} from '../http/test-support.js'
import type { Queue as BullQueue } from 'bullmq'

/**
 * Minimal end-to-end proof that `QueueHttpModule.forRoot()` actually binds
 * into a real Nest HTTP pipeline — DI resolving the handler deps, guards
 * from the module config being enforced, and route params/body reaching
 * the pure `./http` handlers correctly. `QueueHttpDeps` is fully mocked (no
 * Redis) since the business logic itself is already covered by the
 * `../http/*.test.ts` unit suites; this file only tests the wiring.
 */
@Injectable()
class HeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()
    return req.headers['x-test-guard'] === 'allow'
  }
}

describe('QueueHttpModule e2e (Nest DI/guards/params binding)', () => {
  let app: INestApplication
  let queue: BullQueue
  let addClient: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    const job = makeBullJob({ id: 'dispatched-1' })
    queue = makeQueue({ add: vi.fn().mockResolvedValue(job) })
    const queues = makeQueueSource(
      { 'send-email': queue },
      { 'send-email': { waiting: 1, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 } }
    )
    const contracts = makeContracts([
      { name: 'send-email', module: 'notifications', description: 'Send email', dispatchable: true },
    ])
    addClient = vi.fn().mockReturnValue(vi.fn())
    const eventBroadcaster = { addClient, close: vi.fn() }

    const deps = makeDeps({ queues, contracts, eventBroadcaster })

    const moduleRef = await Test.createTestingModule({
      imports: [
        QueueHttpModule.forRoot({
          depsFactory: () => deps,
          getActor: req => (req.headers['x-actor'] as string) ?? 'anonymous',
          guards: [HeaderGuard],
        }),
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    // Actually listening (not just supertest's implicit per-call ephemeral
    // bind) so the SSE test below can hit it with a raw http.request and
    // read the 'response' event on headers — supertest/superagent buffers
    // the whole body before emitting its own 'response' event, which never
    // fires for a connection that (by design) never ends.
    await app.listen(0)
  })

  afterAll(async () => {
    await app.close()
  })

  it('blocks a route when the configured guard rejects the request', async () => {
    await request(app.getHttpServer()).get('/queue/stats').expect(403)
  })

  it('resolves DI-injected deps and returns real handler output when the guard allows it', async () => {
    const res = await request(app.getHttpServer())
      .get('/queue/stats')
      .set('x-test-guard', 'allow')
      .expect(200)

    expect(res.body.queues).toEqual([
      expect.objectContaining({ name: 'send-email', waiting: 1 }),
    ])
  })

  it('binds body + resolves the actor via getActor(req) on POST /queue/dispatch', async () => {
    const res = await request(app.getHttpServer())
      .post('/queue/dispatch')
      .set('x-test-guard', 'allow')
      .set('x-actor', 'qa@telamonjs.dev')
      .send({ queueName: 'send-email', data: { to: 'a@b.com' } })

    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(300)
    expect(res.body).toEqual({ jobId: 'dispatched-1', queueName: 'send-email' })
    expect(queue.add).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ to: 'a@b.com', triggeredBy: 'qa@telamonjs.dev' }),
      undefined
    )
  })

  it('streams SSE headers and registers a client with the injected eventBroadcaster', async () => {
    const { port } = app.getHttpServer().address() as AddressInfo

    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: '/queue/events',
          headers: { 'x-test-guard': 'allow' },
        },
        res => {
          try {
            expect(res.headers['content-type']).toContain('text/event-stream')
            expect(addClient).toHaveBeenCalled()
            resolve()
          } catch (err) {
            reject(err)
          } finally {
            res.destroy()
            req.destroy()
          }
        }
      )
      req.on('error', () => {
        // Destroying an in-flight streaming request surfaces as a socket
        // error client-side — expected, not a test failure.
      })
      req.end()
    })
  })
})

/**
 * `readPermission`/`writePermission` against the real `@telamonjs/permissions`
 * guard — the point of the options is that this guard enforces them.
 */
@Injectable()
class HeaderUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>()
    const header = req.headers['x-permissions']
    req.user = {
      id: 'u1',
      permissions: typeof header === 'string' && header ? header.split(',') : [],
    }
    return true
  }
}

describe('QueueHttpModule e2e (readPermission / writePermission)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const queue = makeQueue({ add: vi.fn().mockResolvedValue(makeBullJob({ id: 'd-1' })) })
    const queues = makeQueueSource(
      { 'send-email': queue },
      { 'send-email': { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 } }
    )
    const contracts = makeContracts([
      { name: 'send-email', module: 'notifications', description: 'Send email', dispatchable: true },
    ])
    const deps = makeDeps({ queues, contracts })

    const moduleRef = await Test.createTestingModule({
      imports: [
        QueueHttpModule.forRoot({
          depsFactory: () => deps,
          getActor: () => 'qa',
          guards: [HeaderUserGuard, createPermissionsGuard()],
          readPermission: 'queue.read',
          writePermission: 'queue.write',
        }),
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    // Listen once on a fixed ephemeral port. Handing supertest an unbound
    // server makes it bind a fresh port per request; under parallel load that
    // port can be answered by another suite's server (a stray 404).
    await app.listen(0, '127.0.0.1')
  })

  afterAll(async () => {
    await app.close()
  })

  const dispatch = (permissions: string) =>
    request(app.getHttpServer())
      .post('/queue/dispatch')
      .set('x-permissions', permissions)
      .send({ queueName: 'send-email', data: {} })

  it('lets a reader read but not write', async () => {
    await request(app.getHttpServer())
      .get('/queue/stats')
      .set('x-permissions', 'queue.read')
      .expect(200)
    await dispatch('queue.read').expect(403)
  })

  it('lets a writer write but not read (the two permissions are independent)', async () => {
    const res = await dispatch('queue.write')
    expect(res.status).toBe(201)
    await request(app.getHttpServer())
      .get('/queue/stats')
      .set('x-permissions', 'queue.write')
      .expect(403)
  })

  it('rejects a logged-in user with neither permission on every kind of route', async () => {
    await request(app.getHttpServer()).get('/queue/config').expect(403)
    await request(app.getHttpServer()).patch('/queue/config/send-email').send({}).expect(403)
    await request(app.getHttpServer()).post('/queue/jobs/remove').send({}).expect(403)
  })
})
