import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { Public } from '@telamonjs/auth/nest'
import { Permissions } from '@telamonjs/permissions/nest'
import { ParametersService } from './parameters.service'
import { CreateParameterDto, UpdateParameterDto } from './dto/parameter.dto'

@Controller('parameters')
export class ParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  /**
   * GET /v1/parameters/public?keys=a,b — no session: `{ key: value }` of the
   * requested parameters marked `public`. Declared before `:id`, or Express
   * would read "public" as an id.
   */
  @Public()
  @Get('public')
  publicValues(@Query('keys') keys?: string) {
    const list = (keys ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
    return list.length ? this.parametersService.publicValues(list) : {}
  }

  @Permissions('parameters.read')
  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('group') group?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.parametersService.list({ page, pageSize, search, group, sortBy, sortOrder })
  }

  @Permissions('parameters.read')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.parametersService.getById(id)
  }

  @Permissions('parameters.write')
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateParameterDto) {
    return this.parametersService.create(dto)
  }

  @Permissions('parameters.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateParameterDto) {
    return this.parametersService.update(id, dto)
  }

  @Permissions('parameters.write')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.parametersService.remove(id)
  }
}
