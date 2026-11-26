import 'reflect-metadata'
import { request as rawRequest } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Global,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseInterceptors,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type Type,
} from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { SkipAudit, createAuditInterceptor, type AuditEntry, type AuditInterceptorOptions } from './audit.interceptor.js'

/**
 * Puts the `x-user` header on `request.user`, the way an auth guard would, and
 * `x-service` on `request.servicePrincipal`, the way `@telamonjs/auth`'s API-key guards do.
 */
@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: unknown; servicePrincipal?: unknown }>()
    if (req.headers['x-user']) req.user = JSON.parse(req.headers['x-user'])
    if (req.headers['x-service']) req.servicePrincipal = JSON.parse(req.headers['x-service'])
    return true
  }
}

@Controller('v1/orders')
class OrdersController {
  @Post()
  create(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return { id: 'o-1', ...body }
  }

  @Put(':id')
  replace(@Param('id') id: string): Record<string, unknown> {
    return { id }
  }

  @Patch(':id')
  update(@Param('id') id: string): Record<string, unknown> {
    return { id }
  }

  @Delete(':id')
  remove(): void {}

  @Get()
  list(): unknown[] {
    return []
  }

  @Post('fail')
  fail(): never {
    throw new BadRequestException('nope')
  }

  @SkipAudit()
  @Post('quiet')
  quiet(): Record<string, unknown> {
    return { ok: true }
  }
}

/** Numeric ids: ParseIntPipe hands the handler 42 for `042`, while `request.params.id` stays `042`. */
@Controller('v1/invoices')
class InvoicesController {
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>): Record<string, unknown> {
    return { id, ...body }
  }

  /** A string id that echoes the body over it. */
  @Put(':id')
  replace(@Param('id') id: string, @Body() body: Record<string, unknown>): Record<string, unknown> {
    return { id, ...body }
  }
}

@SkipAudit()
@Controller('v1/webhooks')
class WebhooksController {
  @Post()
  receive(): Record<string, unknown> {
    return { ok: true }
  }
}

/** Stand-in for the app's PrismaService. */
@Injectable()
class FakeStore {
  rows: AuditEntry[] = []
}

@Global()
@Module({ providers: [FakeStore], exports: [FakeStore] })
class FakeStoreModule {}

let app: INestApplication | undefined

async function boot(
  options: AuditInterceptorOptions,
  controllers: Type[] = [OrdersController, WebhooksController]
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [FakeStoreModule],
    controllers,
    providers: [
      { provide: APP_GUARD, useClass: FakeAuthGuard },
      { provide: APP_INTERCEPTOR, useClass: createAuditInterceptor(options) },
    ],
  }).compile()
  app = moduleRef.createNestApplication({ logger: false })
  await app.init()
  return app
}

/** Collects entries in memory and lets a test await the next write. */
function recorder(): { entries: AuditEntry[]; options: AuditInterceptorOptions } {
  const entries: AuditEntry[] = []
  return { entries, options: { await: true, write: (entry) => void entries.push(entry) } }
}

const USER = JSON.stringify({ id: 'u-1' })

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('createAuditInterceptor', () => {
  describe('Rendering', () => {
    it('POST → CREATE with the entry core: who, what, which, changes, where from', async () => {
      const { entries, options } = recorder()
      const res = await request((await boot(options)).getHttpServer())
        .post('/v1/orders?draft=1')
        .set('x-user', USER)
        .set('user-agent', 'vitest')
        .send({ total: 10 })
      expect(res.status).toBe(201)
      expect(entries).toEqual([
        {
          userId: 'u-1',
          action: 'CREATE',
          entityType: 'orders',
          entityId: 'o-1',
          changes: { total: 10 },
          ipAddress: expect.any(String),
          userAgent: 'vitest',
          method: 'POST',
          path: '/v1/orders',
          statusCode: 201,
        },
      ])
    })

    it.each([
      ['put', 'UPDATE'],
      ['patch', 'UPDATE'],
      ['delete', 'DELETE'],
    ] as const)('%s /:id → %s with the :id param as entityId', async (verb, action) => {
      const { entries, options } = recorder()
      await request((await boot(options)).getHttpServer())[verb]('/v1/orders/o-9').set('x-user', USER)
      expect(entries).toEqual([
        expect.objectContaining({ action, entityType: 'orders', entityId: 'o-9', method: verb.toUpperCase() }),
      ])
      expect(entries[0]).not.toHaveProperty('changes')
    })

    it('redacts the body with the default keys plus redact', async () => {
      const { entries, options } = recorder()
      await request((await boot({ ...options, redact: ['ssn'] })).getHttpServer())
        .post('/v1/orders')
        .set('x-user', USER)
        .send({ password: 'x', ssn: '1', items: [{ token: 't', qty: 2 }] })
      expect(entries[0].changes).toEqual({
        password: '[REDACTED]',
        ssn: '[REDACTED]',
        items: [{ token: '[REDACTED]', qty: 2 }],
      })
    })
  })

  describe('State Management', () => {
    it('reads impersonatedBy from request.user.originalUser (the @telamonjs/auth shape)', async () => {
      const { entries, options } = recorder()
      await request((await boot(options)).getHttpServer())
        .delete('/v1/orders/o-1')
        .set('x-user', JSON.stringify({ id: 'u-2', originalUser: { id: 'admin-1' } }))
      expect(entries[0]).toMatchObject({ userId: 'u-2', impersonatedBy: 'admin-1' })
    })

    it('a custom user resolver', async () => {
      const { entries, options } = recorder()
      await request(
        (
          await boot({ ...options, user: (req) => ({ id: (req as { headers: Record<string, string> }).headers['x-sub'] }) })
        ).getHttpServer()
      )
        .delete('/v1/orders/o-1')
        .set('x-sub', 'svc-7')
      expect(entries[0].userId).toBe('svc-7')
    })

    it.each([
      [{ name: 'jobs' }, 'service:jobs'],
      [{ id: 7, name: 'jobs' }, 'service:7'],
      ['k-1', 'service:k-1'],
      [{ clientId: 'c1' }, 'service:unknown'],
    ])('audits an API-key caller (request.servicePrincipal %j, no request.user) as %s', async (principal, userId) => {
      const { entries, options } = recorder()
      const res = await request((await boot(options)).getHttpServer())
        .delete('/v1/orders/o-1')
        .set('x-service', JSON.stringify(principal))
      expect(res.status).toBe(200)
      expect(entries).toEqual([expect.objectContaining({ userId, action: 'DELETE', entityId: 'o-1' })])
      expect(entries[0]).not.toHaveProperty('impersonatedBy')
    })

    it('skips anonymous requests', async () => {
      const { entries, options } = recorder()
      const res = await request((await boot(options)).getHttpServer()).post('/v1/orders').send({})
      expect(res.status).toBe(201)
      expect(entries).toEqual([])
    })

    it('writes nothing when the handler fails', async () => {
      const { entries, options } = recorder()
      const res = await request((await boot(options)).getHttpServer()).post('/v1/orders/fail').set('x-user', USER)
      expect(res.status).toBe(400)
      expect(entries).toEqual([])
    })

    it('skips reads by default; methods widens the list', async () => {
      const first = recorder()
      await request((await boot(first.options)).getHttpServer()).get('/v1/orders').set('x-user', USER)
      expect(first.entries).toEqual([])
      await app?.close()

      const second = recorder()
      await request((await boot({ ...second.options, methods: ['GET'] })).getHttpServer())
        .get('/v1/orders')
        .set('x-user', USER)
      expect(second.entries).toEqual([expect.objectContaining({ action: 'GET', method: 'GET', statusCode: 200 })])
    })
  })

  describe('Interactions', () => {
    it('@SkipAudit() on a handler or a controller skips it', async () => {
      const { entries, options } = recorder()
      const server = (await boot(options)).getHttpServer()
      await request(server).post('/v1/orders/quiet').set('x-user', USER)
      await request(server).post('/v1/webhooks').set('x-user', USER)
      expect(entries).toEqual([])
    })

    it('ignore(context) skips a request', async () => {
      const { entries, options } = recorder()
      await request(
        (
          await boot({
            ...options,
            ignore: (ctx) => ctx.switchToHttp().getRequest<{ path: string }>().path.endsWith('/o-1'),
          })
        ).getHttpServer()
      )
        .delete('/v1/orders/o-1')
        .set('x-user', USER)
      expect(entries).toEqual([])
    })

    it('resolveEntity overrides the type and id; null skips', async () => {
      const { entries, options } = recorder()
      const server = (
        await boot({
          ...options,
          resolveEntity: (ctx, body) =>
            ctx.getHandler().name === 'remove' ? null : { type: 'Order', id: (body as { id: string }).id },
        })
      ).getHttpServer()
      await request(server).post('/v1/orders').set('x-user', USER).send({})
      await request(server).delete('/v1/orders/o-1').set('x-user', USER)
      expect(entries).toEqual([expect.objectContaining({ entityType: 'Order', entityId: 'o-1' })])
    })

    it('injects the inject tokens into write, after entry and context', async () => {
      const nest = await boot({
        await: true,
        inject: [FakeStore],
        write: (entry, _context, store: FakeStore) => void store.rows.push(entry),
      })
      await request(nest.getHttpServer()).delete('/v1/orders/o-1').set('x-user', USER)
      expect(nest.get(FakeStore).rows).toEqual([expect.objectContaining({ entityId: 'o-1' })])
    })

    it('works per controller with @UseInterceptors()', async () => {
      const entries: AuditEntry[] = []
      const Audit = createAuditInterceptor({ await: true, write: (e) => void entries.push(e) })

      @UseInterceptors(Audit)
      @Controller('v1/notes')
      class NotesController {
        @Post()
        create(): Record<string, unknown> {
          return { id: 7 }
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [NotesController],
        providers: [{ provide: APP_GUARD, useClass: FakeAuthGuard }],
      }).compile()
      app = moduleRef.createNestApplication({ logger: false })
      await app.init()
      await request(app.getHttpServer()).post('/v1/notes').set('x-user', USER)
      expect(entries).toEqual([expect.objectContaining({ entityType: 'notes', entityId: '7' })])
    })
  })

  describe('Edge Cases', () => {
    it('does not wait for the write by default', async () => {
      let release!: () => void
      const written = vi.fn()
      const gate = new Promise<void>((resolve) => (release = resolve))
      const server = (
        await boot({
          write: async () => {
            await gate
            written()
          },
        })
      ).getHttpServer()
      const res = await request(server).delete('/v1/orders/o-1').set('x-user', USER)
      expect(res.status).toBe(200)
      expect(written).not.toHaveBeenCalled()
      release()
      await vi.waitFor(() => expect(written).toHaveBeenCalled())
    })

    it('a failing write never fails the request and goes to onError', async () => {
      const onError = vi.fn()
      const server = (
        await boot({
          await: true,
          onError,
          write: () => {
            throw new Error('db down')
          },
        })
      ).getHttpServer()
      const res = await request(server).post('/v1/orders').set('x-user', USER).send({ total: 1 })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ id: 'o-1' })
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'db down' }), expect.objectContaining({ action: 'CREATE' }))
    })

    it('a rejected write in fire-and-forget mode goes to onError too', async () => {
      const onError = vi.fn()
      const server = (await boot({ onError, write: async () => Promise.reject(new Error('late')) })).getHttpServer()
      await request(server).delete('/v1/orders/o-1').set('x-user', USER)
      await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'late' }), expect.anything()))
    })

    it('without onError, a failing write is logged and the request still succeeds', async () => {
      const res = await request(
        (
          await boot({
            await: true,
            write: () => {
              throw new Error('db down')
            },
          })
        ).getHttpServer()
      )
        .delete('/v1/orders/o-1')
        .set('x-user', USER)
      expect(res.status).toBe(200)
    })

    it('an empty body is no changes', async () => {
      const { entries, options } = recorder()
      await request((await boot(options)).getHttpServer()).post('/v1/orders').set('x-user', USER).send({})
      expect(entries[0]).not.toHaveProperty('changes')
    })

    it.each(['/v1/INVOICES/042', '/v1/Invoices/42', '/v1/invoices/042', '/v1/invoices/42/'])(
      'one record keeps one key whatever URL spelling the router accepted: %s → invoices/42',
      async (url) => {
        const { entries, options } = recorder()
        const res = await request((await boot(options, [InvoicesController])).getHttpServer())
          .patch(url)
          .set('x-user', USER)
          .send({ status: 'VOID' })
        expect(res.status).toBe(200)
        expect(entries).toEqual([expect.objectContaining({ entityType: 'invoices', entityId: '42' })])
      }
    )

    it('an absolute-form request-target is keyed and stored by its pathname', async () => {
      const { entries, options } = recorder()
      const nest = await boot(options, [InvoicesController])
      await nest.listen(0, '127.0.0.1')
      const { port } = nest.getHttpServer().address() as AddressInfo
      const status = await new Promise<number | undefined>((resolve, reject) => {
        rawRequest(
          { host: '127.0.0.1', port, method: 'PATCH', path: 'http://decoy.invalid/v1/invoices/42', headers: { 'x-user': USER } },
          (res) => res.resume().on('end', () => resolve(res.statusCode))
        )
          .on('error', reject)
          .end()
      })
      expect(status).toBe(200)
      expect(entries).toEqual([expect.objectContaining({ entityType: 'invoices', entityId: '42', path: '/v1/invoices/42' })])
    })

    it.each([99, '042', '4.2e1'])('a handler echoing a client id (%j) does not re-key the entry', async (id) => {
      const { entries, options } = recorder()
      await request((await boot(options, [InvoicesController])).getHttpServer())
        .patch('/v1/invoices/42')
        .set('x-user', USER)
        .send({ id })
      expect(entries[0]).toMatchObject({ entityType: 'invoices', entityId: '42' })
    })

    it('a string id is kept as sent: 042 and 42 can be different records', async () => {
      const { entries, options } = recorder()
      await request((await boot(options, [InvoicesController])).getHttpServer())
        .put('/v1/invoices/042')
        .set('x-user', USER)
        .send({ id: '42' })
      expect(entries[0]).toMatchObject({ entityType: 'invoices', entityId: '042' })
    })

    it('a route without a type segment is skipped by the default resolver', async () => {
      @Controller('v2')
      class RootController {
        @Post()
        ping(): Record<string, unknown> {
          return {}
        }
      }
      const { entries, options } = recorder()
      await request((await boot(options, [RootController])).getHttpServer()).post('/v2').set('x-user', USER)
      expect(entries).toEqual([])
    })
  })
})
