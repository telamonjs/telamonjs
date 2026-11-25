import { Controller, Get, Param, Query } from '@nestjs/common'
import { Permissions } from '@telamonjs/permissions/nest'
import { AuditService, type AuditListQuery } from './audit.service'

// Read-only: entries are written by AuditInterceptor, never through the API.
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Filters: entityType, entityId, userId, action (exact), from/to (ISO, inclusive), search. */
  @Permissions('audit.read')
  @Get()
  list(@Query() query: AuditListQuery) {
    return this.auditService.list(query)
  }

  @Permissions('audit.read')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.auditService.getById(id)
  }
}
