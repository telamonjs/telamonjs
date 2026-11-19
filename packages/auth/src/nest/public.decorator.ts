import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Marks a route/controller as public — the JwtAuthGuard allows it without a token.
 * Useful with a global guard (APP_GUARD) and per-route opt-out.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
