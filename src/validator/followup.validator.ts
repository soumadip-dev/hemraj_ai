import { z } from 'zod';

// create follow-up
export const createFollowupSchema = z.object({
  debtorId: z.uuid('Invalid debtor ID'),

  assignedTo: z.uuid('Invalid assigned user ID'),

  type: z.enum(['payment_reminder', 'call', 'email', 'escalation']),

  followUpDate: z.coerce.date('Invalid follow-up date'),

  note: z.string().max(1000).optional(),
});

export const getFollowupsSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'cancelled']).optional(),

  mine: z.enum(['true', 'false']).optional(),

  fromDate: z.coerce.date().optional(),

  toDate: z.coerce.date().optional(),

  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine(value => value >= 1)
    .optional()
    .default(1),

  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine(value => value >= 1 && value <= 100)
    .optional()
    .default(10),
});

export const updateFollowupSchema = z.object({
  assignedTo: z.uuid('Invalid assigned user ID').optional(),
  status: z.enum(['pending', 'in_progress', 'done', 'cancelled']).optional(),
  followUpDate: z.coerce.date().optional(),
  note: z.string().max(1000).optional(),
});

export const followupIdSchema = z.object({
  id: z.uuid('Invalid follow-up ID'),
});
