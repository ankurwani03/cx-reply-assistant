import { audit, json, preflight, requireMembership, requireUser, safeError } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const { user, adminClient } = await requireUser(req);
    const body = await req.json();
    const action = body.action;
    const brandId = typeof body.brandId === "string" ? body.brandId : "";
    if (!/^[0-9a-f-]{36}$/i.test(brandId)) return json(400, { error: "A valid brand is required." });
    await requireMembership(adminClient, user.id, brandId, ["admin"]);
    if (action === "list") {
      const { data, error } = await adminClient.from("knowledge_entries").select("*").eq("brand_id", brandId).order("category").order("title");
      if (error) throw new Error("Could not load knowledge entries.");
      return json(200, { entries: data });
    }
    if (action === "create" || action === "update") {
      const entry = body.entry;
      if (!entry || entry.brand_id !== brandId || !["returns","refunds","shipping","cancellations","general"].includes(entry.category) ||
        typeof entry.title !== "string" || entry.title.trim().length < 3 || entry.title.length > 160 ||
        typeof entry.content !== "string" || entry.content.trim().length < 10 || entry.content.length > 12000 || typeof entry.active !== "boolean") {
        return json(400, { error: "Invalid knowledge entry." });
      }
      let query = action === "create"
        ? adminClient.from("knowledge_entries").insert({ ...entry, title: entry.title.trim(), content: entry.content.trim() })
        : adminClient.from("knowledge_entries").update({ category: entry.category, title: entry.title.trim(), content: entry.content.trim(), active: entry.active }).eq("id", body.id).eq("brand_id", brandId);
      const { data, error } = await query.select("*").single();
      if (error) throw new Error("Knowledge entry could not be saved.");
      await audit(adminClient, { brand_id: brandId, actor_user_id: user.id, action: `knowledge.${action}`, entity_type: "knowledge_entry", entity_id: data.id });
      return json(200, { entry: data });
    }
    if (action === "delete") {
      if (typeof body.id !== "string") return json(400, { error: "A valid entry ID is required." });
      const { error } = await adminClient.from("knowledge_entries").delete().eq("id", body.id).eq("brand_id", brandId);
      if (error) throw new Error("Knowledge entry could not be deleted.");
      await audit(adminClient, { brand_id: brandId, actor_user_id: user.id, action: "knowledge.delete", entity_type: "knowledge_entry", entity_id: body.id });
      return json(200, { success: true });
    }
    return json(400, { error: "Unknown knowledge action." });
  } catch (error) {
    const result = safeError(error); return json(result.status, { error: result.message });
  }
});
