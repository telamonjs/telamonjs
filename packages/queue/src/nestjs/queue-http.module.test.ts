import { describe, it, expect, vi } from 'vitest'
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { RequestMethod } from '@nestjs/common'
import type { CanActivate } from '@nestjs/common'
import { PERMISSIONS_KEY } from '@telamonjs/permissions/nest'
import { QueueHttpModule } from './queue-http.module.js'
import { QueueControllerBase } from './queue-controller-base.js'
import { QUEUE_HTTP_DEPS, QUEUE_HTTP_GET_ACTOR, PERMISSIONS_METADATA_KEY } from './constants.js'

type AnyController = new (...args: unknown[]) => unknown

describe('QueueHttpModule.forRoot', () => {
  it('registers exactly one controller mounted at the "queue" path', () => {
    const dynamicModule = QueueHttpModule.forRoot({ depsFactory: vi.fn(), getActor: vi.fn() })

    expect(dynamicModule.module).toBe(QueueHttpModule)
    expect(dynamicModule.controllers).toHaveLength(1)
    const [controller] = dynamicModule.controllers as AnyController[]
    expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe('queue')
  })

  it('provides QUEUE_HTTP_DEPS via the given depsFactory/inject and QUEUE_HTTP_GET_ACTOR via useValue', () => {
    const depsFactory = vi.fn()
    const getActor = vi.fn()
    const TOKEN = Symbol('some-token')

    const dynamicModule = QueueHttpModule.forRoot({ depsFactory, getActor, inject: [TOKEN] })

    expect(dynamicModule.providers).toEqual(
      expect.arrayContaining([
        { provide: QUEUE_HTTP_DEPS, useFactory: depsFactory, inject: [TOKEN] },
        { provide: QUEUE_HTTP_GET_ACTOR, useValue: getActor },
      ])
    )
  })

  it('defaults `inject` to an empty array when omitted', () => {
    const depsFactory = vi.fn()
    const dynamicModule = QueueHttpModule.forRoot({ depsFactory, getActor: vi.fn() })

    const depsProvider = (
      dynamicModule.providers as Array<{ provide: unknown; inject?: unknown[] }>
    ).find(p => p.provide === QUEUE_HTTP_DEPS)
    expect(depsProvider?.inject).toEqual([])
  })

  it('applies the given guard classes to the controller via @UseGuards', () => {
    class FakeGuard implements CanActivate {
      canActivate() {
        return true
      }
    }

    const dynamicModule = QueueHttpModule.forRoot({
      depsFactory: vi.fn(),
      getActor: vi.fn(),
      guards: [FakeGuard],
    })

    const [controller] = dynamicModule.controllers as AnyController[]
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([FakeGuard])
  })

  it('applies no guards when none are given (route is unprotected)', () => {
    const dynamicModule = QueueHttpModule.forRoot({ depsFactory: vi.fn(), getActor: vi.fn() })
    const [controller] = dynamicModule.controllers as AnyController[]
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([])
  })

  it('each forRoot() call produces an independently bound controller class', () => {
    const first = QueueHttpModule.forRoot({ depsFactory: vi.fn(), getActor: vi.fn() })
    const second = QueueHttpModule.forRoot({ depsFactory: vi.fn(), getActor: vi.fn() })

    const [c1] = first.controllers as AnyController[]
    const [c2] = second.controllers as AnyController[]
    expect(c1).not.toBe(c2)
  })

  describe('readPermission / writePermission', () => {
    const routeNames = Object.getOwnPropertyNames(QueueControllerBase.prototype).filter(
      name =>
        name !== 'constructor' &&
        Reflect.getMetadata(
          METHOD_METADATA,
          (QueueControllerBase.prototype as unknown as Record<string, object>)[name]
        ) !== undefined
    )
    const handlerOf = (controller: AnyController, name: string) =>
      (controller.prototype as Record<string, object>)[name]
    const isRead = (name: string) =>
      Reflect.getMetadata(METHOD_METADATA, handlerOf(QueueControllerBase as never, name)) ===
      RequestMethod.GET

    it('uses the exact metadata key @telamonjs/permissions reads', () => {
      expect(PERMISSIONS_METADATA_KEY).toBe(PERMISSIONS_KEY)
    })

    it('scans the routes of the controller, SSE included', () => {
      expect(routeNames).toEqual(
        expect.arrayContaining(['events', 'getStats', 'dispatch', 'getJobConfigHistory'])
      )
    })

    it('declares readPermission on every GET route and writePermission on every other route', () => {
      const dynamicModule = QueueHttpModule.forRoot({
        depsFactory: vi.fn(),
        getActor: vi.fn(),
        readPermission: 'queue.read',
        writePermission: ['queue.write', ['queue.read', 'queue.admin']],
      })
      const [controller] = dynamicModule.controllers as AnyController[]

      for (const name of routeNames) {
        expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(controller, name)), name).toEqual(
          isRead(name) ? ['queue.read'] : ['queue.write', ['queue.read', 'queue.admin']]
        )
      }
      expect(isRead('events')).toBe(true)
      expect(isRead('dispatch')).toBe(false)
      expect(isRead('updateJobConfig')).toBe(false)
    })

    it('keeps the route metadata on the re-bound handlers', () => {
      const dynamicModule = QueueHttpModule.forRoot({
        depsFactory: vi.fn(),
        getActor: vi.fn(),
        readPermission: 'queue.read',
        writePermission: 'queue.write',
      })
      const [controller] = dynamicModule.controllers as AnyController[]

      for (const name of routeNames) {
        const base = handlerOf(QueueControllerBase as never, name)
        const bound = handlerOf(controller, name)
        expect(Reflect.getMetadata(PATH_METADATA, bound)).toBe(
          Reflect.getMetadata(PATH_METADATA, base)
        )
        expect(Reflect.getMetadata(METHOD_METADATA, bound)).toBe(
          Reflect.getMetadata(METHOD_METADATA, base)
        )
      }
    })

    it('declares no permission at all when neither option is given (unchanged behaviour)', () => {
      const dynamicModule = QueueHttpModule.forRoot({ depsFactory: vi.fn(), getActor: vi.fn() })
      const [controller] = dynamicModule.controllers as AnyController[]

      for (const name of routeNames) {
        expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(controller, name))).toBeUndefined()
      }
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller)).toBeUndefined()
    })

    it('applies only the given side when one option is omitted', () => {
      const dynamicModule = QueueHttpModule.forRoot({
        depsFactory: vi.fn(),
        getActor: vi.fn(),
        writePermission: 'queue.write',
      })
      const [controller] = dynamicModule.controllers as AnyController[]

      expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(controller, 'getStats'))).toBeUndefined()
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(controller, 'dispatch'))).toEqual([
        'queue.write',
      ])
    })

    it('throws at boot when a permission is an empty list (it would leave the routes open)', () => {
      const base = { depsFactory: vi.fn(), getActor: vi.fn() }
      expect(() => QueueHttpModule.forRoot({ ...base, readPermission: [] })).toThrow(
        /readPermission/
      )
      expect(() => QueueHttpModule.forRoot({ ...base, writePermission: [] })).toThrow(
        /writePermission/
      )
      expect(() =>
        QueueHttpModule.forRoot({ ...base, writePermission: ['queue.write', []] })
      ).toThrow(/writePermission/)
    })

    it('does not leak permissions between forRoot() calls or onto the base class', () => {
      const first = QueueHttpModule.forRoot({
        depsFactory: vi.fn(),
        getActor: vi.fn(),
        writePermission: 'a.write',
      })
      const second = QueueHttpModule.forRoot({
        depsFactory: vi.fn(),
        getActor: vi.fn(),
        writePermission: 'b.write',
      })
      const [c1] = first.controllers as AnyController[]
      const [c2] = second.controllers as AnyController[]

      expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(c1, 'dispatch'))).toEqual(['a.write'])
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(c2, 'dispatch'))).toEqual(['b.write'])
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(QueueControllerBase as never, 'dispatch'))
      ).toBeUndefined()
    })
  })
})
