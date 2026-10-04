import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name too long'),

  email: z.email('Invalid email format').max(255),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long (bcrypt limit is 72 bytes)')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),

  departmentId: z.string(),
});

export const loginSchema = z.object({
  email: z.email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password too big'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
