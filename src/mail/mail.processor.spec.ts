import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { MAIL_JOB } from './mail.constants';
import { MailProcessor } from './mail.processor';

describe('MailProcessor', () => {
  let processor: MailProcessor;
  let mail: jest.Mocked<Pick<MailService, 'sendMail'>>;

  const appCfg = { frontendUrl: 'https://app.example.com' };

  beforeEach(() => {
    mail = { sendMail: jest.fn() };
    processor = new MailProcessor(
      mail as unknown as MailService,
      appCfg as never,
    );
  });

  const job = (name: string, data: object) => ({ name, data }) as Job;

  it('sends a card-assigned email', async () => {
    await processor.process(
      job(MAIL_JOB.CARD_ASSIGNED, {
        to: 'a@b.com',
        cardTitle: 'Fix bug',
        boardId: 'board-1',
        cardId: 'card-1',
      }),
    );

    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'a@b.com',
      subject: 'Bạn được giao thẻ: Fix bug',
      template: 'card-assigned',
      context: {
        cardTitle: 'Fix bug',
        boardId: 'board-1',
        cardId: 'card-1',
        frontendUrl: appCfg.frontendUrl,
      },
    });
  });

  it('sends a generic email with the given template', async () => {
    await processor.process(
      job(MAIL_JOB.SEND_EMAIL, {
        to: 'a@b.com',
        subject: 'Custom subject',
        template: 'custom-template',
        context: { foo: 'bar' },
      }),
    );

    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'a@b.com',
      subject: 'Custom subject',
      template: 'custom-template',
      context: { foo: 'bar', frontendUrl: appCfg.frontendUrl },
    });
  });

  it('sends a password-reset email', async () => {
    await processor.process(
      job(MAIL_JOB.PASSWORD_RESET, {
        to: 'a@b.com',
        resetUrl: 'https://app.example.com/reset?token=abc',
      }),
    );

    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'a@b.com',
      subject: 'Đặt lại mật khẩu Kanvas',
      template: 'forgot-password',
      context: {
        resetUrl: 'https://app.example.com/reset?token=abc',
        frontendUrl: appCfg.frontendUrl,
      },
    });
  });

  it('sends a board-invitation email', async () => {
    await processor.process(
      job(MAIL_JOB.BOARD_INVITATION, {
        to: 'a@b.com',
        boardName: 'Sprint Board',
        invitedByName: 'Alice',
        acceptUrl: 'https://app.example.com/invite/xyz',
      }),
    );

    expect(mail.sendMail).toHaveBeenCalledWith({
      to: 'a@b.com',
      subject: 'Alice đã mời bạn vào board "Sprint Board"',
      template: 'board-invitation',
      context: {
        boardName: 'Sprint Board',
        invitedByName: 'Alice',
        acceptUrl: 'https://app.example.com/invite/xyz',
        frontendUrl: appCfg.frontendUrl,
      },
    });
  });

  it('does nothing for an unknown job name', async () => {
    await processor.process(job('unknown-job', {}));

    expect(mail.sendMail).not.toHaveBeenCalled();
  });
});
