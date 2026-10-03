import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().default(''),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  REDIS_URL: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform(value =>
      value
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    ),
});

export const env = envSchema.parse(process.env);
