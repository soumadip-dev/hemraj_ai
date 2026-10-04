import { z } from 'zod';

export const feedbackSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),

  rating: z.union([z.literal(-1), z.literal(1)]),

  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
});
