import { describe, expect, it } from "vitest";
import { knowledgeSchema, messageSchema } from "./schemas";

describe("message validation", () => {
  it("rejects an empty message", () => {
    expect(messageSchema.safeParse({ conversationId: crypto.randomUUID(), body: " ", idempotencyKey: crypto.randomUUID() }).success).toBe(false);
  });
  it("rejects a message over the limit", () => {
    expect(messageSchema.safeParse({ conversationId: crypto.randomUUID(), body: "a".repeat(4001), idempotencyKey: crypto.randomUUID() }).success).toBe(false);
  });
});
describe("knowledge validation", () => {
  it("requires meaningful policy content", () => {
    expect(knowledgeSchema.safeParse({ brand_id: crypto.randomUUID(), category: "refunds", title: "Refunds", content: "short", active: true }).success).toBe(false);
  });
  it("accepts valid knowledge entry", () => {
    expect(knowledgeSchema.safeParse({ brand_id: crypto.randomUUID(), category: "refunds", title: "Refund eligibility", content: "Refunds are available within seven days after delivery.", active: true }).success).toBe(true);
  });
});
