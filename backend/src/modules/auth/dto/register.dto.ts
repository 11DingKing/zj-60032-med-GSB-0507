import { IsString, IsNotEmpty, MinLength, IsOptional, IsPhoneNumber, IsEmail, IsInt, Min, Max } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  realName: string;

  @IsString()
  @IsOptional()
  @IsPhoneNumber('CN')
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(150)
  age?: number;

  @IsString()
  @IsOptional()
  gender?: string;
}
