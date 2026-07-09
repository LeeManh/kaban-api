import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;
}
