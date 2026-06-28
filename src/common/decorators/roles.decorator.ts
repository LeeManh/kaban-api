import { SetMetadata } from '@nestjs/common';
import { Role } from 'generated/prisma/enums';

export const ROLES_KEY = 'REQUIRE_ROLES';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
