import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_BACKGROUND_SIZE } from '../board.constants';

export class PresignBoardBackgroundDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @Matches(/^image\//, { message: 'contentType phải là ảnh (image/*)' })
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_BACKGROUND_SIZE)
  size!: number;
}
