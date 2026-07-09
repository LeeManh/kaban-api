import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { BoardInvitesController } from './board-invites.controller';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [InvitesController, BoardInvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
