import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color phải là mã hex 6 ký tự, ví dụ #36B37E',
  })
  color!: string;
}
