import { audit, json, preflight, requireMembership, requireUser, safeError } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  let userId: string | null = null;
  try {
    const { user, adminClient } = await requireUser(req); userId = user.id;
    const body = await req.json();
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const message = typeof body.body === "string" ? body.body.trim() : "";
    const senderType = body.senderType;
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
    if (!/^[0-9a-f-]{36}$/i.test(conversationId) || !/^[0-9a-f-]{36}$/i.test(idempotencyKey) || !message || message.length > 4000 || !["customer","agent"].includes(senderType)) {
      return json(400, { error: "Invalid message request." });
    }
    const { data: conversation, error: conversationError } = await adminClient.from("conversations").select("id,brand_id").eq("id", conversationId).maybeSingle();
    if (conversationError || !conversation) return json(404, { error: "Conversation not found." });
    await requireMembership(adminClient, user.id, conversation.brand_id, ["admin","agent"]);
    const { data: existing } = await adminClient.from("messages").select("*").eq("conversation_id", conversationId).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return json(200, { message: existing, duplicate: true });
    const { data: messageRow, error } = await adminClient.from("messages").insert({
      brand_id: conversation.brand_id, conversation_id: conversationId, sender_type: senderType,
      sender_user_id: user.id, body: message, idempotency_key: idempotencyKey, status: "sent"
    }).select("*").single();
    if (error) {
      if (error.code === "23505") {
        const { data: duplicate } = await adminClient.from("messages").select("*").eq("conversation_id", conversationId).eq("idempotency_key", idempotencyKey).maybeSingle();
        if (duplicate) return json(200, { message: duplicate, duplicate: true });
      }
      throw new Error("Message could not be saved.");
    }
    await adminClient.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    await audit(adminClient, { brand_id: conversation.brand_id, actor_user_id: user.id, action: "message.sent", entity_type: "message", entity_id: messageRow.id, metadata: { sender_type: senderType } });
    return json(201, { message: messageRow });
  } catch (error) {
    const result = safeError(error);
    return json(result.status, { error: result.message });
  }
});
