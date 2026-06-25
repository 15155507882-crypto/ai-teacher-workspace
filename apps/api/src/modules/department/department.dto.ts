import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, IsIn } from 'class-validator';

export class CreateDepartmentDto {
  @IsInt()
  @IsNotEmpty()
  school_id: number;

  @IsOptional()
  @IsInt()
  parent_id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  parent_id?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'disabled'])
  status?: string;
}
