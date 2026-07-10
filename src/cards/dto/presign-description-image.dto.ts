import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_DESCRIPTION_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export class PresignDescriptionImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @Matches(/^image\//, { message: 'contentType phải là ảnh (image/*)' })
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_DESCRIPTION_IMAGE_SIZE)
  size!: number;
}
