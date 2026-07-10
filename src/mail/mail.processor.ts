import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { type ConfigType } from '@nestjs/config';
import { Job } from 'bullmq';
import { appConfig } from '../config';
import { MailService } from './mail.service';
import { MAIL_JOB, MAIL_QUEUE } from './mail.constants';
import type {
  BoardInvitationData,
  CardAssignedData,
  PasswordResetData,
  SendEmailData,
} from './mail.types';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  constructor(
    private readonly mail: MailService,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case MAIL_JOB.CARD_ASSIGNED: {
        const { to, cardTitle, boardId, cardId } = job.data as CardAssignedData;
        await this.sendTemplateEmail({
          to,
          subject: `Bạn được giao thẻ: ${cardTitle}`,
          template: 'card-assigned',
          context: { cardTitle, boardId, cardId },
        });
        break;
      }

      case MAIL_JOB.SEND_EMAIL: {
        const { to, subject, template, context } = job.data as SendEmailData;
        await this.sendTemplateEmail({ to, subject, template, context });
        break;
      }

      case MAIL_JOB.PASSWORD_RESET: {
        const { to, resetUrl } = job.data as PasswordResetData;
        await this.sendTemplateEmail({
          to,
          subject: 'Đặt lại mật khẩu Kanvas',
          template: 'forgot-password',
          context: { resetUrl },
        });
        break;
      }

      case MAIL_JOB.BOARD_INVITATION: {
        const { to, boardName, invitedByName, acceptUrl } =
          job.data as BoardInvitationData;
        await this.sendTemplateEmail({
          to,
          subject: `${invitedByName} đã mời bạn vào board "${boardName}"`,
          template: 'board-invitation',
          context: { boardName, invitedByName, acceptUrl },
        });
        break;
      }
    }
  }

  private async sendTemplateEmail(params: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }) {
    await this.mail.sendMail({
      ...params,
      context: { ...params.context, frontendUrl: this.appCfg.frontendUrl },
    });
  }
}
