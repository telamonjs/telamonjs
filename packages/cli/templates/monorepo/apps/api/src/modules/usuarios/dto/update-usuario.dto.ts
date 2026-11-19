import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { RoleName } from '@prisma/client'

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Senha deve ter no mínimo 5 caracteres' })
  password?: string

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName

  @IsOptional()
  @IsBoolean()
  ativo?: boolean
}
