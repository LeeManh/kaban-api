import { IsEnum, IsOptional } from 'class-validator';
import { InviteLinkPermission, Role } from 'generated/prisma/enums';

export class CreateInviteLinkDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(InviteLinkPermission)
  permission?: InviteLinkPermission;
}
