import { Controller, Module, RequestMethod, SetMetadata, UseGuards } from '@nestjs/common'
// `.js`: @nestjs/common has no `exports` map, so Node16 resolution needs the file name.
import { METHOD_METADATA } from '@nestjs/common/constants.js'
import type {
  CanActivate,
  DynamicModule,
  InjectionToken,
  OptionalFactoryDependency,
  Type,
} from '@nestjs/common'
import { QueueControllerBase } from './queue-controller-base.js'
import {
  PERMISSIONS_METADATA_KEY,
  QUEUE_HTTP_DEPS,
  QUEUE_HTTP_GET_ACTOR,
} from './constants.js'
import type { QueueHttpDeps } from '../http/index.js'
import type { GetActorFn } from './types.js'

/**
 * Permissions a route requires, as `@telamonjs/permissions`' `@Permissions()`
 * takes them: a string is one permission; an array is a list of clauses
 * (OR between entries, an inner array is AND).
 */
type QueueRoutePermission = string | Array<string | string[]>

export interface QueueHttpModuleOptions {
  /**
   * Builds the deps the handlers run against — usually returns your app's
   * `queues` (a `QueueSource`, preferably `queueSourceFromRegistry` when
   * this process doesn't own every job class) / JobConfigStore / contracts
   * singletons.
   */
  depsFactory: (...args: never[]) => QueueHttpDeps | Promise<QueueHttpDeps>
  /** Tokens injected into `depsFactory`, in order (same convention as any Nest `useFactory`). */
  inject?: Array<InjectionToken | OptionalFactoryDependency>
  /**
   * Applied to every route via `@UseGuards(...guards)`. A guard class is
   * instantiated through this module's DI (register its own dependencies
   * there, e.g. by importing the module that provides them) — pass an
   * instance instead to sidestep DI entirely.
   */
  guards?: Array<Type<CanActivate> | CanActivate>
  /**
   * Required by every `GET` route (stats, jobs, history, configs, the SSE
   * stream). Declared as permission metadata that `@telamonjs/permissions`'
   * guard enforces (global or in `guards`). Omitted: read routes declare
   * nothing, so any request that gets past your guards can read.
   */
  readPermission?: QueueRoutePermission
  /**
   * Required by every `POST`/`PATCH` route (dispatch, retry, remove,
   * promote, bulk, queue actions, job config edits and toggles). Same
   * mechanism as `readPermission`. Omitted: any request that gets past your
   * guards can write.
   */
  writePermission?: QueueRoutePermission
  /** Populates `triggeredBy`/`updatedBy` from the request — this package never assumes an auth/user shape. */
  getActor: GetActorFn
}

/**
 * Gives `target` its own copy of every route handler that needs a
 * permission and declares it there. Nest reads handler metadata off the
 * method function, and the inherited ones are shared by every `forRoot()`
 * call — so each bound controller gets a wrapper carrying the route
 * metadata of the original plus its own permissions.
 */
function applyRoutePermissions(
  target: Type<QueueControllerBase>,
  read: QueueRoutePermission | undefined,
  write: QueueRoutePermission | undefined
): void {
  const base = QueueControllerBase.prototype as unknown as Record<string, unknown>

  for (const name of Object.getOwnPropertyNames(base)) {
    const handler = base[name]
    if (name === 'constructor' || typeof handler !== 'function') continue
    const method: unknown = Reflect.getMetadata(METHOD_METADATA, handler)
    if (method === undefined) continue // not a route

    const permission = method === RequestMethod.GET ? read : write
    if (permission === undefined) continue

    const wrapper = function (this: QueueControllerBase, ...args: unknown[]): unknown {
      return (handler as (...a: unknown[]) => unknown).apply(this, args)
    }
    for (const key of Reflect.getOwnMetadataKeys(handler)) {
      Reflect.defineMetadata(key, Reflect.getOwnMetadata(key, handler), wrapper)
    }
    SetMetadata(PERMISSIONS_METADATA_KEY, typeof permission === 'string' ? [permission] : permission)(
      wrapper
    )
    Object.defineProperty(target.prototype, name, {
      value: wrapper,
      writable: true,
      configurable: true,
    })
  }
}

/**
 * Wires the pure `./http` handlers + the SSE route to a NestJS controller.
 * `@nestjs/common`/`@nestjs/core` are optional peers — only a consumer that
 * imports `./nestjs` pays for them.
 */
@Module({})
export class QueueHttpModule {
  static forRoot(options: QueueHttpModuleOptions): DynamicModule {
    const { depsFactory, inject = [], guards = [], getActor } = options

    @UseGuards(...guards)
    @Controller('queue')
    class BoundQueueController extends QueueControllerBase {}

    applyRoutePermissions(BoundQueueController, options.readPermission, options.writePermission)

    return {
      module: QueueHttpModule,
      controllers: [BoundQueueController],
      providers: [
        { provide: QUEUE_HTTP_DEPS, useFactory: depsFactory, inject },
        { provide: QUEUE_HTTP_GET_ACTOR, useValue: getActor },
      ],
    }
  }
}
