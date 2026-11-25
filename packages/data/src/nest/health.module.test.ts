import 'reflect-metadata'
import { afterEach, describe, expect, it } from 'vitest'
import { Global, Injectable, Module, SetMetadata, type INestApplication, type Type } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { HealthModule, type HealthModuleOptions } from './health.module.js'

/** Stand-in for the app's PrismaService: anything the checks factory gets injected. */
@Injectable()
class FakePrisma {
  up = true
  async $queryRaw(): Promise<unknown> {
    if (!this.up) throw new Error('connection refused')
    return [{ '?column?': 1 }]
  }
}

@Global()
@Module({ providers: [FakePrisma], exports: [FakePrisma] })
class FakePrismaModule {}

let app: INestApplication | undefined

async function boot(options: HealthModuleOptions): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [FakePrismaModule, HealthModule.forRoot(options)],
  }).compile()
  app = moduleRef.createNestApplication({ logger: false })
  await app.init()
  return app
}

const prismaChecks: HealthModuleOptions = {
  inject: [FakePrisma],
  checks: (prisma: FakePrisma) => ({ database: () => prisma.$queryRaw() }),
}

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('HealthModule', () => {
  describe('Rendering', () => {
    it('GET /health → 200 with status, timestamp, uptime and each check', async () => {
      const res = await request((await boot(prismaChecks)).getHttpServer()).get('/health')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        database: 'connected',
      })
    })
  })

  describe('State Management', () => {
    it('503 with status error when the database is down', async () => {
      const nest = await boot(prismaChecks)
      nest.get(FakePrisma).up = false
      const res = await request(nest.getHttpServer()).get('/health')
      expect(res.status).toBe(503)
      expect(res.body).toMatchObject({ status: 'error', database: 'disconnected' })
    })

    it('downStatus overrides the 503 for setups that read only the body', async () => {
      const nest = await boot({ ...prismaChecks, downStatus: 200 })
      nest.get(FakePrisma).up = false
      const res = await request(nest.getHttpServer()).get('/health')
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ status: 'error', database: 'disconnected' })
    })

    // Regression: @nestjs/swagger 7 reads each route's design:paramtypes and
    // crashed at boot when the published controller had none (a Nest 10 app)
    it('declares the route param types (Swagger reads them)', () => {
      const [controller] = HealthModule.forRoot(prismaChecks).controllers ?? []
      expect(Reflect.getMetadata('design:paramtypes', (controller as Type).prototype, 'check')).toEqual([Object])
    })

    it('builds a Swagger document with the health controller mounted', async () => {
      const nest = await boot(prismaChecks)
      const document = SwaggerModule.createDocument(nest, new DocumentBuilder().build())
      expect(document.paths['/health']).toBeDefined()
    })

    it('a check resolving false is down; any other value is up', async () => {
      const res = await request(
        (
          await boot({
            checks: () => ({ database: () => true, redis: async () => false, s3: () => 'PONG' }),
          })
        ).getHttpServer()
      ).get('/health')
      expect(res.status).toBe(503)
      expect(res.body).toMatchObject({ database: 'connected', redis: 'disconnected', s3: 'connected' })
    })

    it('a check that throws synchronously is down', async () => {
      const res = await request(
        (
          await boot({
            checks: () => ({
              database: () => {
                throw new Error('no client')
              },
            }),
          })
        ).getHttpServer()
      ).get('/health')
      expect(res.status).toBe(503)
    })
  })

  describe('Interactions', () => {
    it('serves on a custom path', async () => {
      const nest = await boot({ ...prismaChecks, path: 'status/live' })
      expect((await request(nest.getHttpServer()).get('/status/live')).status).toBe(200)
      expect((await request(nest.getHttpServer()).get('/health')).status).toBe(404)
    })

    it('applies class decorators to the controller (e.g. the auth package @Public())', () => {
      const dynamic = HealthModule.forRoot({ ...prismaChecks, decorators: [SetMetadata('isPublic', true)] })
      const controller = dynamic.controllers?.[0] as Type
      expect(Reflect.getMetadata('isPublic', controller)).toBe(true)
    })

    it('resolves an async checks factory', async () => {
      const res = await request(
        (await boot({ checks: async () => ({ database: () => true }) })).getHttpServer()
      ).get('/health')
      expect(res.body.database).toBe('connected')
    })
  })

  describe('Edge Cases', () => {
    it.each(['status', 'timestamp', 'uptime'])('refuses a check named %s at boot', async (name) => {
      await expect(boot({ checks: () => ({ [name]: () => true }) })).rejects.toThrow(name)
    })

    it('two forRoot() calls keep their own path and checks', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          HealthModule.forRoot({ checks: () => ({ database: () => true }) }),
          HealthModule.forRoot({ path: 'ready', checks: () => ({ queue: () => false }) }),
        ],
      }).compile()
      app = moduleRef.createNestApplication({ logger: false })
      await app.init()
      expect((await request(app.getHttpServer()).get('/health')).body).toMatchObject({ database: 'connected' })
      const ready = await request(app.getHttpServer()).get('/ready')
      expect(ready.status).toBe(503)
      expect(ready.body).not.toHaveProperty('database')
    })
  })
})
