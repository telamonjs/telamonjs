import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Password must be at least 5 characters' })
  password?: string

  /** Replaces the user's roles; their token goes stale (accessChangedAt) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[]

  /** false ends every open session (sessionsRevokedAt) */
  @IsOptional()
  @IsBoolean()
  active?: boolean
}
