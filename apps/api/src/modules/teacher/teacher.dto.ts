import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsInt,
  IsOptional,
  MinLength,
  IsIn,
} from 'class-validator';

export class CreateTeacherDto {
  @IsInt()
  school_id: number;

  @IsInt()
  department_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(['teacher', 'admin'])
  role?: string;
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsInt()
  department_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['teacher', 'admin'])
  role?: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(30)
  password: string;
}

export class StatusChangeDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
