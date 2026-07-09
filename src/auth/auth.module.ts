import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailModule } from '../mail/mail.module';
import { InvitesModule } from '../invites/invites.module';

@Module({
  imports: [MailModule, InvitesModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
