import { z } from 'zod';

export const agentQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Query must contain at least 2 characters')
    .max(500, 'Query cannot exceed 500 characters'),

  sessionId: z.uuid('Invalid session ID').optional(),
});

export const sessionSchema = z.object({
  id: z.uuid('Invalid session ID'),
});
