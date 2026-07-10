import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { EmailFrequency } from 'generated/prisma/enums';

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsEnum(EmailFrequency)
  emailFrequency?: EmailFrequency;

  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dueDatesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  removedFromCardEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  attachmentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  cardsMovedEnabled?: boolean;
}
