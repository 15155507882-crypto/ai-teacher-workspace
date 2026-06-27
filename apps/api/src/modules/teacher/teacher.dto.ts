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

  /** 多组织ID，逗号分隔 */
  @IsOptional()
  @IsString()
  department_ids?: string;

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
  @MaxLength(50)
  employee_no?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  /** 支持多角色，逗号分隔，如 "teacher,head_teacher" */
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  sort?: number;

  @IsOptional()
  is_home_visible?: boolean;
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsInt()
  department_id?: number;

  /** 多组织ID，逗号分隔 */
  @IsOptional()
  @IsString()
  department_ids?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employee_no?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  /** 支持多角色，逗号分隔 */
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  sort?: number;

  @IsOptional()
  is_home_visible?: boolean;
}

export class TeacherQueryDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  size?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  department_id?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
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
