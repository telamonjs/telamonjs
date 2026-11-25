import { IsOptional, IsString, Matches, MinLength } from 'class-validator'

const CODE = /^[a-z][a-z0-9_-]*$/
const CODE_MESSAGE = 'Code: lowercase letters, digits, - and _'

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  name!: string

  @Matches(CODE, { message: CODE_MESSAGE })
  code!: string

  @IsOptional()
  @IsString()
  description?: string
}

/**
 * Permissions are checked by permission code, never by role code, so a custom
 * role's code can change. Built-in roles (`system`) are locked.
 */
export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @IsOptional()
  @Matches(CODE, { message: CODE_MESSAGE })
  code?: string

  @IsOptional()
  @IsString()
  description?: string
}
