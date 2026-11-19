import { describe, it, expect, vi } from 'vitest'
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import type { CanActivate } from '@nestjs/common'
import { QueueHttpModule } from './queue-http.module.js'
import { QUEUE_HTTP_DEPS, QUEUE_HTTP_GET_ACTOR } from './constants.js'

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
})
