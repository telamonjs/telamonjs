import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { AuthUser } from './jwt-auth.guard'

/** AdminGuard — only `role === 'ADMIN'` passes. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user as AuthUser | undefined
    if (!user) throw new UnauthorizedException('Não autorizado')
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem executar esta ação')
    }
    return true
  }
}
