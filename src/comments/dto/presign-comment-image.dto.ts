import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_COMMENT_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_COMMENT_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export class PresignCommentImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_COMMENT_IMAGE_MIME)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_COMMENT_IMAGE_SIZE)
  size!: number;
}
