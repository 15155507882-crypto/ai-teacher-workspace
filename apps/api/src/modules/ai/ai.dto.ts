import { IsString, IsOptional, IsInt } from 'class-validator';

export class ChatDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsInt()
  file_id?: number;

  @IsOptional()
  @IsString()
  scope?: string;
}
