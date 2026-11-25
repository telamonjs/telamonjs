import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { Permissions } from '@telamonjs/permissions/nest'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthUser } from '../../common/guards/jwt-auth.guard'
import { UsuariosService } from './usuarios.service'
import { CreateUsuarioDto } from './dto/create-usuario.dto'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'

// No DELETE: users are deactivated (PATCH { active: false }), never removed.
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Permissions('users.read')
  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.usuariosService.list({ page, pageSize, search, sortBy, sortOrder })
  }

  @Permissions('users.read')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usuariosService.getById(id)
  }

  @Permissions('users.write')
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto)
  }

  @Permissions('users.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto, @CurrentUser() user: AuthUser) {
    return this.usuariosService.update(id, dto, user.id)
  }
}
