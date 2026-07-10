import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export class PresignAvatarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_AVATAR_MIME)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AVATAR_SIZE)
  size!: number;
}
