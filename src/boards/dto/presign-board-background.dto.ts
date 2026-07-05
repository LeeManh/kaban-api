import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ALLOWED_BACKGROUND_MIME,
  MAX_BACKGROUND_SIZE,
} from '../board.constants';

export class PresignBoardBackgroundDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_BACKGROUND_MIME)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_BACKGROUND_SIZE)
  size!: number;
}
