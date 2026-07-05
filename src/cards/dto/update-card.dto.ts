import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { CreateCardDto } from './create-card.dto';

export class UpdateCardDto extends PartialType(CreateCardDto) {
  @IsInt()
  @Min(0)
  version!: number;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}
