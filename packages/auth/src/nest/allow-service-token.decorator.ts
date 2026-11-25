import { SetMetadata } from '@nestjs/common'

export const ALLOW_SERVICE_TOKEN_KEY = 'allowServiceToken'

/**
 * Marks a route/controller that accepts an API key as well as a session:
 * a guard built with `createJwtAuthGuard({ apiKey })` lets a valid key through
 * and otherwise runs the normal session check. Unlike `@Public()`, the route
 * is never open.
 */
export const AllowServiceToken = () =>
  SetMetadata(ALLOW_SERVICE_TOKEN_KEY, true)
