import { Pool } from 'pg';
import { env } from './env.config';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: false,
});
