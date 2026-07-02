import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { mailConfig } from '../config';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(
    @Inject(mailConfig.KEY)
    cfg: ConfigType<typeof mailConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    this.from = cfg.from ?? 'Kanvas <no-reply@kanvas.local>';
  }

  async sendMail(params: { to: string; subject: string; html: string }) {
    await this.transporter.sendMail({ from: this.from, ...params });
  }
}
