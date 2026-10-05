import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().default(''),

  NODE_ENV: z.string().default('development'),
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
  JWT_SECRET: z.string().default('secret'),
  JWT_ACCESS_TOKEN_SECRET: z.string().default('secret-ai'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('1d'),
  JWT_REFRESH_TOKEN_SECRET: z.string().default('ai-secret'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('10d'),
  REDIS_URL: z.string().default(''),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  LLM_MODEL_NAME: z.string().default('gemini-3.5-flash-lite'),
  GEMINI_API_KEY: z.string().default(''),
});

export const env = envSchema.parse(process.env);
