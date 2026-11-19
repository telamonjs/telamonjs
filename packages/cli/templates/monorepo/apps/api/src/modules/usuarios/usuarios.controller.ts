import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminOnly } from '../../common/decorators/admin-only.decorator'
import type { AuthUser } from '../../common/guards/jwt-auth.guard'
import { UsuariosService } from './usuarios.service'
import { CreateUsuarioDto } from './dto/create-usuario.dto'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

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

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usuariosService.getById(id)
  }

  // Only admins can create users — mirrors the inline `requireAdmin` the
  // Next.js route handler used to do.
  @AdminOnly()
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto, @CurrentUser() user: AuthUser) {
    return this.usuariosService.update(id, dto, user.id)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usuariosService.remove(id, user.id)
  }
}
