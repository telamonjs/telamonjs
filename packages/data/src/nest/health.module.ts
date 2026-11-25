import {
  Controller,
  Get,
  Inject,
  Module,
  Res,
  type DynamicModule,
  type InjectionToken,
  type ModuleMetadata,
  type OptionalFactoryDependency,
} from '@nestjs/common'

/** One probe: resolving `false`, rejecting or throwing means down; anything else means up. */
export type HealthCheck = () => unknown

/** Probes by name; each name becomes a key of the response (`database`, `redis`, …). */
export type HealthChecks = Record<string, HealthCheck>

/** `GET /health` body: `status`, `timestamp`, `uptime`, then each check as `connected` | `disconnected`. */
export interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  /** `process.uptime()`, in seconds. */
  uptime: number
  [check: string]: string | number
}

export interface HealthModuleOptions {
  /**
   * Builds the probes from the injected `inject` tokens, in order (the same
   * convention as a Nest `useFactory`):
   *
   * ```ts
   * inject: [PrismaService],
   * checks: (prisma: PrismaService) => ({ database: () => prisma.$queryRaw`SELECT 1` }),
   * ```
   */
  checks: (...deps: never[]) => HealthChecks | Promise<HealthChecks>
  /** Tokens passed to `checks`. */
  inject?: Array<InjectionToken | OptionalFactoryDependency>
  /** Modules that provide the `inject` tokens, when they are not global. */
  imports?: ModuleMetadata['imports']
  /** Route of the controller. Default `'health'`. */
  path?: string
  /**
   * Class decorators applied to the controller, e.g. the auth package's
   * `@Public()` or `@SkipThrottle()`. This package imports no auth.
   */
  decorators?: ClassDecorator[]
  /**
   * Status code when a check is down. Default `503`. Set `200` when a Docker /
   * CI health check reads only the body (`status`, `<check>: 'disconnected'`).
   */
  downStatus?: number
}

const HEALTH_CHECKS = Symbol('HEALTH_CHECKS')
const RESERVED = ['status', 'timestamp', 'uptime']

async function probe(check: HealthCheck): Promise<'connected' | 'disconnected'> {
  try {
    return (await check()) === false ? 'disconnected' : 'connected'
  } catch {
    return 'disconnected'
  }
}

/**
 * `GET /health`: runs every check in parallel and answers 200 when all are up,
 * 503 (or `downStatus`; same body, `status: 'error'`) when any is down, so Docker and load
 * balancer health checks can read the status code.
 *
 * ```ts
 * HealthModule.forRoot({
 *   decorators: [Public()],
 *   inject: [PrismaService],
 *   checks: (prisma: PrismaService) => ({ database: () => prisma.$queryRaw`SELECT 1` }),
 * })
 * ```
 */
@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions): DynamicModule {
    @Controller(options.path ?? 'health')
    class HealthController {
      constructor(@Inject(HEALTH_CHECKS) private readonly checks: HealthChecks) {}

      @Get()
      async check(@Res({ passthrough: true }) res: { status(code: number): unknown }): Promise<HealthResponse> {
        const results = await Promise.all(
          Object.entries(this.checks).map(async ([name, check]) => [name, await probe(check)] as const)
        )
        const down = results.some(([, state]) => state === 'disconnected')
        if (down) res.status(options.downStatus ?? 503)
        return {
          status: down ? 'error' : 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          ...Object.fromEntries(results),
        }
      }
    }
    // Route param types for tools that read them (@nestjs/swagger 7 crashes at
    // boot without them). Set by hand: neither tsc here nor an app's bundler
    // (esbuild, swc) is guaranteed to emit decorator metadata.
    const reflect = Reflect as unknown as {
      defineMetadata?: (key: string, value: unknown, target: object, property: string) => void
    }
    reflect.defineMetadata?.('design:paramtypes', [Object], HealthController.prototype, 'check')
    for (const decorate of options.decorators ?? []) decorate(HealthController)

    return {
      module: HealthModule,
      imports: options.imports ?? [],
      controllers: [HealthController],
      providers: [
        {
          provide: HEALTH_CHECKS,
          inject: options.inject ?? [],
          useFactory: async (...deps: never[]): Promise<HealthChecks> => {
            const checks = await options.checks(...deps)
            const clash = Object.keys(checks).find((name) => RESERVED.includes(name))
            if (clash) throw new Error(`HealthModule: a check cannot be named "${clash}"`)
            return checks
          },
        },
      ],
    }
  }
}
