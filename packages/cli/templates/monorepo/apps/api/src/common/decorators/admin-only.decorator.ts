import { applyDecorators, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../guards/admin.guard'

/** Equivalent to a `requireAdmin()` check: only `role === 'ADMIN'` passes. */
export const AdminOnly = () => applyDecorators(UseGuards(AdminGuard))
