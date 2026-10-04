import { z } from 'zod';

// GET debtor schema
export const getDebtorsSchema = z.object({
  search: z.string().trim().optional(),

  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),

  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),

  dateFrom: z.coerce.date().optional(),

  dateTo: z.coerce.date().optional(),

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

// GET bebters by id schema
export const debtorIdSchema = z.object({
  id: z.uuid('Invalid debtor ID'),
});

// get transactionn of debtors
export const getDebtorTransactionsSchema = z.object({
  id: z.uuid('Invalid debtor ID'),

  type: z.enum(['invoice', 'payment', 'credit_note']).optional(),

  status: z.enum(['open', 'partially_paid', 'paid', 'written_off']).optional(),

  dateFrom: z.coerce.date().optional(),

  dateTo: z.coerce.date().optional(),

  minAgeingDays: z.coerce.number().int().min(0).optional(),

  sortBy: z.enum(['issue_date', 'due_date', 'amount', 'created_at']).default('issue_date'),

  sortOrder: z.enum(['asc', 'desc']).default('desc'),

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

export type GetDebtorsInput = z.infer<typeof getDebtorsSchema>;

export type DebtorIdInput = z.infer<typeof debtorIdSchema>;

export type GetDebtorTransactionsInput = z.infer<typeof getDebtorTransactionsSchema>;
