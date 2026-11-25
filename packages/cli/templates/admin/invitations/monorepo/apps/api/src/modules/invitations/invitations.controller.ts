import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common'
import { Public } from '@telamonjs/auth/nest'
import { Permissions } from '@telamonjs/permissions/nest'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/guards/jwt-auth.guard'
import { InvitationsService } from './invitations.service'
import { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation.dto'

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * GET /v1/invitations/by-token/:token — no session: what the accept page
   * shows. Only a PENDING invitation reveals its email and name.
   */
  @Public()
  @Get('by-token/:token')
  byToken(@Param('token') token: string) {
    return this.invitationsService.byToken(token)
  }

  /** POST /v1/invitations/accept — no session: creates the user, marks the invitation ACCEPTED. */
  @Public()
  @Post('accept')
  @HttpCode(201)
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(dto)
  }

  @Permissions('invitations.read')
  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.invitationsService.list({ page, pageSize, search, sortBy, sortOrder })
  }

  @Permissions('invitations.write')
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateInvitationDto, @CurrentUser() user: AuthUser) {
    return this.invitationsService.create(dto, user.id)
  }

  @Permissions('invitations.write')
  @Post(':id/resend')
  @HttpCode(200)
  resend(@Param('id') id: string) {
    return this.invitationsService.resend(id)
  }

  @Permissions('invitations.write')
  @Put(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.invitationsService.revoke(id)
  }
}
