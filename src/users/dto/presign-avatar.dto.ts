import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

export class PresignAvatarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @Matches(/^image\//, { message: 'contentType phải là ảnh (image/*)' })
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AVATAR_SIZE)
  size!: number;
}
