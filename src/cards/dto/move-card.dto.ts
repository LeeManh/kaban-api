import { IsOptional, IsString } from 'class-validator';

// - listId:   list đích; bỏ trống = giữ nguyên list hiện tại (chỉ reorder)
// - beforeId: card sẽ đứng NGAY TRƯỚC card đang di chuyển (trong list đích)
// - afterId:  card sẽ đứng NGAY SAU card đang di chuyển (trong list đích)
// Bỏ cả before/after → thả vào cuối list đích.
export class MoveCardDto {
  @IsOptional()
  @IsString()
  listId?: string;

  @IsOptional()
  @IsString()
  beforeId?: string;

  @IsOptional()
  @IsString()
  afterId?: string;
}
