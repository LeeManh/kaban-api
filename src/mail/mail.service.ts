import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(params: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }) {
    await this.mailerService.sendMail(params);
  }
}
