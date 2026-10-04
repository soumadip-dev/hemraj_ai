import type { CookieOptions } from 'express';
import { env } from './env.config';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict', // ← 'lax' se 'strict' (CSRF protection)
};

// Access token cookie — 15 minutes
export const accessCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
};

// Refresh token cookie — 7 days
export const refreshCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 10 * 24 * 60 * 60 * 1000, // 7 days
};
