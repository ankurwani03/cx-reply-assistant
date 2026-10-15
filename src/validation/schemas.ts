import { z } from "zod";

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "Message cannot be empty.").max(4000, "Message must be 4,000 characters or fewer."),
  idempotencyKey: z.string().uuid()
});
export const knowledgeSchema = z.object({
  brand_id: z.string().uuid(),
  category: z.enum(["returns", "refunds", "shipping", "cancellations", "general"]),
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(10).max(12000),
  active: z.boolean()
});
export const generateSchema = z.object({
  conversationId: z.string().uuid(),
  triggeringMessageId: z.string().uuid().optional()
});
export type KnowledgeForm = z.infer<typeof knowledgeSchema>;
