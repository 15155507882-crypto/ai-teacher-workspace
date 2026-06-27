import { IsString, IsNotEmpty, MaxLength, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSchoolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  short_name: string;

  @IsOptional()
  logo_file_id?: number | null;

  @IsOptional()
  @IsString()
  logo_data?: string | null;
}

export class SemesterDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() start: string;
  @IsString() @IsNotEmpty() end: string;
}

export class UpdateSchoolSettingsDto {
  @IsOptional()
  @IsArray()
  academic_years?: string[];

  @IsOptional()
  @IsString()
  current_year?: string;

  @IsOptional()
  @IsArray()
  @Type(() => SemesterDto)
  semesters?: SemesterDto[];

  @IsOptional()
  @IsString()
  current_semester?: string;
}
