import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthUser } from '../guards/jwt-auth.guard'

/**
 * Extracts the authenticated user (attached by JwtAuthGuard) from the request.
 *
 * @example
 * @Get('profile')
 * async profile(@CurrentUser() user: AuthUser) { return user }
 * async create(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  const user = request.user as AuthUser
  return data ? user?.[data] : user
})
