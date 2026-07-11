import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ALLOWED_MIME, MAX_FILE_SIZE } from '../attachment.constants';

export class PresignAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @IsIn(ALLOWED_MIME)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE)
  size!: number;
}
