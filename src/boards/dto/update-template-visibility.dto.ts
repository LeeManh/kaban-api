import { IsEnum } from 'class-validator';
import { TemplateVisibility } from 'generated/prisma/enums';

export class UpdateTemplateVisibilityDto {
  @IsEnum(TemplateVisibility)
  templateVisibility!: TemplateVisibility;
}
