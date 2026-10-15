import { audit, json, preflight, requireMembership, requireUser, safeError } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const { user, adminClient } = await requireUser(req);
    const body = await req.json();
    const action = body.action;
    const generationId = typeof body.generationId === "string" ? body.generationId : "";
    if (!["edit","approve","send"].includes(action)) return json(400, { error: "Unknown draft action." });
    if (!/^[0-9a-f-]{36}$/i.test(generationId)) return json(400, { error: "A valid generation is required." });
    const { data: generation, error } = await adminClient.from("ai_generations").select("*").eq("id", generationId).maybeSingle();
    if (error || !generation) return json(404, { error: "Draft not found." });
    await requireMembership(adminClient, user.id, generation.brand_id, ["admin","agent"]);
    if (action === "edit") {
      const editedDraft = typeof body.editedDraft === "string" ? body.editedDraft.trim() : "";
      if (!editedDraft || editedDraft.length > 4000) return json(400, { error: "Draft must contain 1–4,000 characters." });
      const { data, error: updateError } = await adminClient.from("ai_generations").update({ edited_draft: editedDraft, status: "edited" }).eq("id", generationId).select("*").single();
      if (updateError) throw new Error("Draft edit could not be saved.");
      await audit(adminClient, { brand_id: generation.brand_id, actor_user_id: user.id, action: "ai.draft_edited", entity_type: "ai_generation", entity_id: generationId });
      return json(200, { generation: data });
    }
    if (action === "approve") {
      if (generation.status === "failed" || generation.status === "blocked") return json(409, { error: "This draft cannot be approved." });
      const { data, error: updateError } = await adminClient.from("ai_generations").update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() }).eq("id", generationId).select("*").single();
      if (updateError) throw new Error("Draft could not be approved.");
      await audit(adminClient, { brand_id: generation.brand_id, actor_user_id: user.id, action: "ai.draft_approved", entity_type: "ai_generation", entity_id: generationId });
      return json(200, { generation: data });
    }
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const messageText = typeof body.body === "string" ? body.body.trim() : "";
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
    if (conversationId !== generation.conversation_id || !messageText || messageText.length > 4000 || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return json(400, { error: "Invalid send request." });
    if (generation.status !== "approved") return json(409, { error: "Approve the draft before sending." });
    const { data: existing } = await adminClient.from("messages").select("*").eq("conversation_id", conversationId).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return json(200, { message: existing, duplicate: true });
    const { data: message, error: sendError } = await adminClient.from("messages").insert({
      brand_id: generation.brand_id, conversation_id: conversationId, sender_type: "agent", sender_user_id: user.id,
      body: messageText, idempotency_key: idempotencyKey, status: "sent"
    }).select("*").single();
    if (sendError) throw new Error("Final response could not be sent.");
    const { error: genError } = await adminClient.from("ai_generations").update({ status: "sent", final_text: messageText, sent_message_id: message.id }).eq("id", generationId);
    if (genError) throw new Error("Message saved but generation audit update failed. Contact an administrator.");
    await adminClient.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    await audit(adminClient, { brand_id: generation.brand_id, actor_user_id: user.id, action: "ai.final_response_sent", entity_type: "message", entity_id: message.id, metadata: { generation_id: generationId } });
    return json(201, { message, generationId });
  } catch (error) {
    const result = safeError(error); return json(result.status, { error: result.message });
  }
});
