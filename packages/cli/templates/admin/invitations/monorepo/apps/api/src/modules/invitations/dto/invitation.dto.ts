import { Transform } from 'class-transformer'
import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateInvitationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  name?: string | null

  /** Role ids the user gets on accepting — each must exist */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[] = []
}

export class AcceptInvitationDto {
  @IsString()
  @MinLength(1)
  token!: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  name!: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string
}
