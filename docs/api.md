# API contract

All function requests require a Supabase Auth access token. Edge Functions verify the JWT and check the caller's brand membership before accessing tenant data. Error responses use `{ "error": "safe message" }`.

## `send-message` — POST
Body: `{ conversationId: UUID, body: string, senderType: "customer" | "agent", idempotencyKey: UUID }`
Persists a message and returns `{ message, duplicate? }`. Duplicate requests with the same conversation/idempotency key return the original message.

## `generate-reply` — POST
Body: `{ conversationId: UUID, triggeringMessageId?: UUID }`
Loads the trusted brand association, recent messages, order context and active brand-filtered policy entries; ranks relevant evidence; calls OpenRouter when evidence exists; stores a generation; returns `{ generation, draft, knowledge, warning }`. If evidence is missing or AI fails, returns a cautious fallback with a warning. The agent must review all drafts.

## `manage-knowledge` — POST
Body actions:
- `{ action: "list", brandId }`
- `{ action: "create" | "update", brandId, entry, id? }`
- `{ action: "delete", brandId, id }`
Admin membership is required. UI CRUD uses RLS-protected direct table calls in this version; the function is also available for trusted server workflows.

## `manage-draft` — POST
- Edit: `{ action: "edit", generationId, editedDraft }`
- Approve: `{ action: "approve", generationId }`
- Send: `{ action: "send", generationId, conversationId, body, idempotencyKey }`
Send is allowed only after approval and persists the final response as a conversation message.

## Authorization model
Brand IDs from the browser are never accepted as proof of access. Functions load the conversation/generation first, derive `brand_id` from that record, then check `brand_memberships`. The service-role key is server-only and must be configured as a Supabase function secret.
