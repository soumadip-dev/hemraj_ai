import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.string().default('development'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().default(''),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  REDIS_URL: z.string().default(''),

  CORS_ORIGINS: z
    .string()
    .default('')
    .transform(value =>
      value
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    ),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  JWT_ACCESS_TOKEN_SECRET: z.string().default('secret-ai'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('1d'),
  JWT_REFRESH_TOKEN_SECRET: z.string().default('ai-secret'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('10d'),

  GEMINI_API_KEY: z.string().default(''),
  LLM_MODEL_NAME: z.string().default('gemini-3.5-flash-lite'),
});

export const env = envSchema.parse(process.env);
