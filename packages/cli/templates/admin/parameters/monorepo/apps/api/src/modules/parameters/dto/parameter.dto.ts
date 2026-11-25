import { IsBoolean, IsIn, IsOptional, IsString, Matches } from 'class-validator'
import { PARAMETER_TYPES, type ParameterType } from '../parameter-value'

const KEY = /^[A-Za-z0-9_.-]+$/
const KEY_MESSAGE = 'Key: letters, digits, ., - and _'

export class CreateParameterDto {
  @Matches(KEY, { message: KEY_MESSAGE })
  key!: string

  /** Text, read through `type` (validated against it in the service) */
  @IsString()
  value!: string

  @IsOptional()
  @IsIn(PARAMETER_TYPES)
  type?: ParameterType

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  group?: string | null

  @IsOptional()
  @IsBoolean()
  public?: boolean
}

export class UpdateParameterDto {
  @IsOptional()
  @Matches(KEY, { message: KEY_MESSAGE })
  key?: string

  @IsOptional()
  @IsString()
  value?: string

  @IsOptional()
  @IsIn(PARAMETER_TYPES)
  type?: ParameterType

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  group?: string | null

  @IsOptional()
  @IsBoolean()
  public?: boolean
}
