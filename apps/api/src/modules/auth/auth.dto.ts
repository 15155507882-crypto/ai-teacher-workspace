import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(11, 11, { message: '手机号必须为11位' })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 30, { message: '密码长度6-30位' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
