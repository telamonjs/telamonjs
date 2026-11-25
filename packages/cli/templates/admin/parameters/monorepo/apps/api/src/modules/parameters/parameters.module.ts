import { Module } from '@nestjs/common'
import { ParametersController } from './parameters.controller'
import { ParametersService } from './parameters.service'

// Exports ParametersService: import this module to read a value with `get()`.
@Module({ controllers: [ParametersController], providers: [ParametersService], exports: [ParametersService] })
export class ParametersModule {}
