import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { type ConfigType } from '@nestjs/config';
import { join } from 'path';
import { mailConfig } from '../config';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { MAIL_QUEUE } from './mail.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: MAIL_QUEUE }),
    MailerModule.forRootAsync({
      inject: [mailConfig.KEY],
      useFactory: (cfg: ConfigType<typeof mailConfig>) => ({
        transport: {
          host: cfg.host,
          port: cfg.port,
          auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
        },
        defaults: {
          from: cfg.from ?? 'Kanvas <no-reply@kanvas.local>',
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
            partials: { dir: join(__dirname, 'templates/partials') },
          },
        },
      }),
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [BullModule],
})
export class MailModule {}
