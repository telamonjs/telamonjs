/**
 * @telamonjs/queue/nestjs
 *
 * NestJS binding for `./http`'s framework-agnostic queue handlers.
 * `@nestjs/common`/`@nestjs/core` are OPTIONAL peer dependencies — only a
 * consumer that imports this subpath needs them installed.
 */
export { QueueHttpModule } from './queue-http.module.js'
export type { QueueHttpModuleOptions } from './queue-http.module.js'
export { QueueControllerBase } from './queue-controller-base.js'
export type { GetActorFn } from './types.js'
