import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { RoleName } from '@prisma/client'

export class CreateUsuarioDto {
  @IsString()
  name!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(5, { message: 'Senha deve ter no mínimo 5 caracteres' })
  password!: string

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName = RoleName.USER

  @IsOptional()
  @IsBoolean()
  ativo?: boolean = true
}
