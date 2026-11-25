import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  Catch,
  Controller,
  Get,
  HttpException,
  Logger,
  NotFoundException,
  type ArgumentsHost,
  type ExceptionFilter,
  type INestApplication,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library'
import {
  PrismaExceptionFilter,
  isPrismaKnownRequestError,
  isPrismaValidationError,
} from './prisma-exception.filter.js'

const known = (code: string, meta?: Record<string, unknown>): PrismaClientKnownRequestError =>
  new PrismaClientKnownRequestError(`prisma ${code}`, { code, clientVersion: '6.2.0', meta })

const validation = (): PrismaClientValidationError =>
  new PrismaClientValidationError('Argument `name` is missing.', { clientVersion: '6.2.0' })

/** Runs the filter against a fake HTTP host and returns what it sent. */
function run(
  filter: PrismaExceptionFilter,
  exception: unknown,
  req: { url?: string; method?: string } = { url: '/v1/things/1', method: 'POST' }
): { status: number; body: Record<string, unknown> } {
  const sent = { status: 0, body: {} as Record<string, unknown> }
  const response = {
    status(code: number) {
      sent.status = code
      return { json: (body: Record<string, unknown>) => (sent.body = body) }
    },
  }
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => req }),
  } as unknown as ArgumentsHost
  filter.catch(exception, host)
  return sent
}

describe('PrismaExceptionFilter', () => {
  describe('Detection', () => {
    it('recognizes the real Prisma error classes by shape', () => {
      expect(isPrismaKnownRequestError(known('P2002'))).toBe(true)
      expect(isPrismaValidationError(validation())).toBe(true)
      expect(isPrismaKnownRequestError(validation())).toBe(false)
      expect(isPrismaValidationError(known('P2002'))).toBe(false)
    })

    it('accepts a copy from another @prisma/client instance (no instanceof)', () => {
      const copy = Object.assign(new Error('x'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P2025',
        clientVersion: '5.22.0',
      })
      expect(isPrismaKnownRequestError(copy)).toBe(true)
    })

    it('rejects errors that only look like a P-code', () => {
      expect(isPrismaKnownRequestError(Object.assign(new Error('x'), { code: 'P2002' }))).toBe(false)
      expect(isPrismaKnownRequestError({ code: 'ENOENT', clientVersion: '6' })).toBe(false)
      expect(isPrismaKnownRequestError(null)).toBe(false)
      expect(isPrismaValidationError('PrismaClientValidationError')).toBe(false)
    })
  })

  describe('Mapping', () => {
    const filter = new PrismaExceptionFilter()

    it('P2002 → 409 naming the conflicting fields', () => {
      const { status, body } = run(filter, known('P2002', { target: ['email', 'tenantId'] }))
      expect(status).toBe(409)
      expect(body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
        message: 'Duplicate record: email, tenantId already exists',
        field: 'email',
        path: '/v1/things/1',
      })
      expect(typeof body.timestamp).toBe('string')
    })

    it('P2002 with a constraint name instead of a field list', () => {
      const { body } = run(filter, known('P2002', { target: 'User_email_key' }))
      expect(body).toMatchObject({ field: 'User_email_key' })
    })

    it('P2002 without target', () => {
      const { body } = run(filter, known('P2002'))
      expect(body.message).toBe('Duplicate record')
      expect(body).not.toHaveProperty('field')
    })

    it('P2003 → 400 naming the foreign key', () => {
      const { status, body } = run(filter, known('P2003', { field_name: 'Post_authorId_fkey (index)' }))
      expect(status).toBe(400)
      expect(body).toMatchObject({
        error: 'Bad Request',
        message: 'Invalid reference: Post_authorId_fkey (index) does not exist',
        field: 'Post_authorId_fkey (index)',
      })
    })

    it.each([
      ['P2025', 404, 'Not Found'],
      ['P2011', 400, 'Bad Request'],
      ['P2012', 400, 'Bad Request'],
      ['P2014', 400, 'Bad Request'],
      ['P1000', 503, 'Service Unavailable'],
      ['P1001', 503, 'Service Unavailable'],
      ['P1002', 503, 'Service Unavailable'],
      ['P1003', 503, 'Service Unavailable'],
    ])('%s → %i', (code, statusCode, error) => {
      const { status, body } = run(filter, known(code))
      expect(status).toBe(statusCode)
      expect(body).toMatchObject({ statusCode, error })
      expect(body.message).toEqual(expect.any(String))
    })

    it('PrismaClientValidationError → 400', () => {
      const { status, body } = run(filter, validation())
      expect(status).toBe(400)
      expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request', message: 'Invalid data' })
    })

    it('an unmapped code → 500, logged', () => {
      const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
      const { status, body } = run(filter, known('P2034'))
      expect(status).toBe(500)
      expect(body).toMatchObject({ error: 'Internal Server Error', message: 'Internal server error' })
      expect(log).toHaveBeenCalledWith(expect.stringContaining('P2034'), expect.any(String))
      log.mockRestore()
    })
  })

  describe('Options', () => {
    it('overrides messages per code, with a string or a function of the fields', () => {
      const filter = new PrismaExceptionFilter({
        messages: {
          P2025: 'Nothing here',
          P2002: (fields) => `Taken: ${fields.join(' + ')}`,
          validation: 'Bad input',
          default: 'Oops',
        },
      })
      expect(run(filter, known('P2025')).body.message).toBe('Nothing here')
      expect(run(filter, known('P2002', { target: ['a', 'b'] })).body.message).toBe('Taken: a + b')
      expect(run(filter, validation()).body.message).toBe('Bad input')
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
      expect(run(filter, known('P2034')).body.message).toBe('Oops')
      vi.restoreAllMocks()
      // Untouched codes keep the English default
      expect(run(filter, known('P2014')).body.message).toMatch(/^Cannot delete/)
    })

    it('passes the error to a message function', () => {
      const filter = new PrismaExceptionFilter({
        messages: { P2003: (_fields, error) => `code ${String((error as { code?: string }).code)}` },
      })
      expect(run(filter, known('P2003')).body.message).toBe('code P2003')
    })
  })

  describe('Edge Cases', () => {
    it('rethrows outside HTTP (RPC, WebSocket, GraphQL)', () => {
      const filter = new PrismaExceptionFilter()
      const error = known('P2002')
      const host = { getType: () => 'rpc' } as unknown as ArgumentsHost
      expect(() => filter.catch(error, host)).toThrow(error)
    })

    it('subclasses can override one case and delegate the rest', () => {
      class DeleteAware extends PrismaExceptionFilter {
        catch(exception: unknown, host: ArgumentsHost): void {
          const req = host.switchToHttp().getRequest<{ method?: string }>()
          if (isPrismaKnownRequestError(exception) && exception.code === 'P2003' && req.method === 'DELETE') {
            host.switchToHttp().getResponse<{ status(c: number): { json(b: unknown): void } }>().status(409).json({ statusCode: 409 })
            return
          }
          super.catch(exception, host)
        }
      }
      const filter = new DeleteAware()
      expect(run(filter, known('P2003'), { url: '/x', method: 'DELETE' }).status).toBe(409)
      expect(run(filter, known('P2003'), { url: '/x', method: 'POST' }).status).toBe(400)
    })
  })

  describe('Nest wiring (global filter in a real app)', () => {
    let app: INestApplication

    /** The app's own catch-all filter: must still receive every non-Prisma error. */
    @Catch()
    class AppFallbackFilter implements ExceptionFilter {
      catch(exception: unknown, host: ArgumentsHost): void {
        const status = exception instanceof HttpException ? exception.getStatus() : 500
        host.switchToHttp().getResponse<{ status(c: number): { json(b: unknown): void } }>().status(status).json({ handledBy: 'app', status })
      }
    }

    @Controller('things')
    class ThingsController {
      @Get('duplicate')
      duplicate(): never {
        throw known('P2002', { target: ['slug'] })
      }
      @Get('invalid')
      invalid(): never {
        throw validation()
      }
      @Get('missing')
      missing(): never {
        throw new NotFoundException()
      }
      @Get('boom')
      boom(): never {
        throw new Error('boom')
      }
    }

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({ controllers: [ThingsController] }).compile()
      app = moduleRef.createNestApplication({ logger: false })
      // Registered AFTER the fallback, so Nest tries it first — it must only claim Prisma errors
      app.useGlobalFilters(new AppFallbackFilter(), new PrismaExceptionFilter())
      await app.init()
    })

    afterAll(async () => {
      await app.close()
    })

    it('answers Prisma errors', async () => {
      const res = await request(app.getHttpServer()).get('/things/duplicate')
      expect(res.status).toBe(409)
      expect(res.body).toMatchObject({ statusCode: 409, field: 'slug', path: '/things/duplicate' })
      expect((await request(app.getHttpServer()).get('/things/invalid')).status).toBe(400)
    })

    it('leaves every other error to the app filters', async () => {
      const missing = await request(app.getHttpServer()).get('/things/missing')
      expect(missing.body).toEqual({ handledBy: 'app', status: 404 })
      const boom = await request(app.getHttpServer()).get('/things/boom')
      expect(boom.body).toEqual({ handledBy: 'app', status: 500 })
    })
  })
})
