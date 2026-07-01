import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT as string,
  region: process.env.STORAGE_REGION ?? 'auto',
  accessKeyId: process.env.STORAGE_ACCESS_KEY as string,
  secretAccessKey: process.env.STORAGE_SECRET_KEY as string,
  bucket: process.env.STORAGE_BUCKET as string,
  forcePathStyle: true,
}));
