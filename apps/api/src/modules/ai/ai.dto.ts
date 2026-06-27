import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

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

  @IsOptional()
  @IsString()
  mode?: string;
}

export class ConfirmActionDto {
  @IsInt()
  messageId: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsInt()
  linkedContentId?: number;

  @IsOptional()
  extractedEntities?: Record<string, any>;
}
