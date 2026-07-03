import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().uri(),

  // Database (Prisma)
  DATABASE_URL: Joi.string().uri().required(),

  // JWT — dual token
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string(),
  JWT_REFRESH_REMEMBER_EXPIRES_IN: Joi.string(),

  // Redis
  REDIS_URL: Joi.string().uri(),

  // Object storage
  STORAGE_ENDPOINT: Joi.string().uri(),
  STORAGE_REGION: Joi.string().default('auto'),
  STORAGE_ACCESS_KEY: Joi.string(),
  STORAGE_SECRET_KEY: Joi.string(),
  STORAGE_BUCKET: Joi.string(),

  // Mail (SMTP)
  MAIL_HOST: Joi.string(),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string(),
  MAIL_PASS: Joi.string(),
  MAIL_FROM: Joi.string(),
});
