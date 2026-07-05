import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  background!: string;
}
