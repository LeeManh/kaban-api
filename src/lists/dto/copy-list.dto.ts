import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CopyListDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}
