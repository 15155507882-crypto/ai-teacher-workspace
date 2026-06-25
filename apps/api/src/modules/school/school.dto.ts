import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

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
}
