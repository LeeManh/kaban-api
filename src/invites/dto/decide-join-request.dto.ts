import { IsEnum, IsIn } from 'class-validator';
import { JoinRequestStatus } from 'generated/prisma/enums';

export class DecideJoinRequestDto {
  @IsEnum(JoinRequestStatus)
  @IsIn([JoinRequestStatus.APPROVED, JoinRequestStatus.REJECTED])
  status!: JoinRequestStatus;
}
