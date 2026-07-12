import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MoveListDto {
  @IsOptional()
  @IsString()
  beforeId?: string;

  @IsOptional()
  @IsString()
  afterId?: string;

  @IsOptional()
  @IsString()
  targetBoardId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;
}
