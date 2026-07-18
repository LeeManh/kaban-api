import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TemplateCategory } from 'generated/prisma/enums';

export class CreateTemplateFromBoardDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsEnum(TemplateCategory)
  templateCategory!: TemplateCategory;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
