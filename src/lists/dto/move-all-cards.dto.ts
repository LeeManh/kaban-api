import { IsNotEmpty, IsString } from 'class-validator';

export class MoveAllCardsDto {
  @IsString()
  @IsNotEmpty()
  targetListId!: string;
}
