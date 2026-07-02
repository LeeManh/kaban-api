import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST as string,
  port: Number(process.env.MAIL_PORT) || 587,
  user: process.env.MAIL_USER as string,
  pass: process.env.MAIL_PASS as string,
  from: process.env.MAIL_FROM as string,
}));
