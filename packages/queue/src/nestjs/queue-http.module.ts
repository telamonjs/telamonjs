import { Controller, Module, UseGuards } from '@nestjs/common'
import type {
  CanActivate,
  DynamicModule,
  InjectionToken,
  OptionalFactoryDependency,
  Type,
} from '@nestjs/common'
import { QueueControllerBase } from './queue-controller-base.js'
import { QUEUE_HTTP_DEPS, QUEUE_HTTP_GET_ACTOR } from './constants.js'
import type { QueueHttpDeps } from '../http/index.js'
import type { GetActorFn } from './types.js'

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
  /** Populates `triggeredBy`/`updatedBy` from the request — this package never assumes an auth/user shape. */
  getActor: GetActorFn
}

/**
 * Wires the 18 pure `./http` handlers + the SSE route to a NestJS
 * controller. `@nestjs/common`/`@nestjs/core` are optional peers — only a
 * consumer that imports `./nestjs` pays for them.
 */
@Module({})
export class QueueHttpModule {
  static forRoot(options: QueueHttpModuleOptions): DynamicModule {
    const { depsFactory, inject = [], guards = [], getActor } = options

    @UseGuards(...guards)
    @Controller('queue')
    class BoundQueueController extends QueueControllerBase {}

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
