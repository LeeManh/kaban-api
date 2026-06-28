import { IsOptional, IsString } from 'class-validator';

// - beforeId: list sẽ đứng NGAY TRƯỚC list đang di chuyển
// - afterId:  list sẽ đứng NGAY SAU list đang di chuyển
// Bỏ trống beforeId → chèn lên đầu; bỏ trống afterId → chèn xuống cuối.
export class MoveListDto {
  @IsOptional()
  @IsString()
  beforeId?: string;

  @IsOptional()
  @IsString()
  afterId?: string;
}
