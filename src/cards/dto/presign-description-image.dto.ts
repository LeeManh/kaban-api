import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_DESCRIPTION_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_DESCRIPTION_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export class PresignDescriptionImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_DESCRIPTION_IMAGE_MIME)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_DESCRIPTION_IMAGE_SIZE)
  size!: number;
}
