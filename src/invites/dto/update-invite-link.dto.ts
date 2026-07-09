import { PartialType } from '@nestjs/mapped-types';
import { CreateInviteLinkDto } from './create-invite-link.dto';

export class UpdateInviteLinkDto extends PartialType(CreateInviteLinkDto) {}
