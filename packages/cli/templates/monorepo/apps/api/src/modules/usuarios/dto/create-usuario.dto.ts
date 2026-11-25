import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateUsuarioDto {
  @IsString()
  name!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(5, { message: 'Password must be at least 5 characters' })
  password!: string

  /** Role ids — the user holds the union of their permissions */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[] = []

  @IsOptional()
  @IsBoolean()
  active?: boolean = true
}
