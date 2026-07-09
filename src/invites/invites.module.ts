import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { BoardInvitesController } from './board-invites.controller';
import { InviteLinksService } from './invite-links.service';
import { InviteLinksController } from './invite-links.controller';
import { BoardInviteLinksController } from './board-invite-links.controller';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [
    InvitesController,
    BoardInvitesController,
    InviteLinksController,
    BoardInviteLinksController,
  ],
  providers: [InvitesService, InviteLinksService],
  exports: [InvitesService, InviteLinksService],
})
export class InvitesModule {}
