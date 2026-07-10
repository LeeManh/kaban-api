import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_COMMENT_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export class PresignCommentImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @Matches(/^image\//, { message: 'contentType phải là ảnh (image/*)' })
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_COMMENT_IMAGE_SIZE)
  size!: number;
}
