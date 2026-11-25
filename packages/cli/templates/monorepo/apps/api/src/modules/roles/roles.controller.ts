import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { Permissions } from '@telamonjs/permissions/nest'
import { RolesService } from './roles.service'
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto'

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // users.write too: the user form lists the roles to assign
  @Permissions('roles.read', 'users.write')
  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.rolesService.list({ page, pageSize, search, sortBy, sortOrder })
  }

  // Declared before `:id`, or Express would read "matrix" as an id
  @Permissions('roles.read')
  @Get('matrix')
  matrix() {
    return this.rolesService.matrix()
  }

  @Permissions('roles.read')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.rolesService.getById(id)
  }

  @Permissions('roles.write')
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto)
  }

  @Permissions('roles.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto)
  }

  @Permissions('roles.write')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id)
  }

  @Permissions('roles.write')
  @Post(':id/permissions/:permissionId')
  @HttpCode(204)
  grant(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.rolesService.setPermission(id, permissionId, true)
  }

  @Permissions('roles.write')
  @Delete(':id/permissions/:permissionId')
  @HttpCode(204)
  revoke(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.rolesService.setPermission(id, permissionId, false)
  }
}
