import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "http://localhost:5173",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
export function preflight(req: Request) {
  return req.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
}
export function getClients(req: Request): { userClient: SupabaseClient; adminClient: SupabaseClient } {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) throw new Error("Server configuration is incomplete.");
  const authorization = req.headers.get("Authorization") ?? "";
  return {
    userClient: createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } }),
    adminClient: createClient(url, service, { auth: { persistSession: false } }),
  };
}
export async function requireUser(req: Request) {
  const { userClient, adminClient } = getClients(req);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return { user: data.user, userClient, adminClient };
}
export async function requireMembership(adminClient: SupabaseClient, userId: string, brandId: string, roles?: string[]) {
  const { data, error } = await adminClient.from("brand_memberships").select("role").eq("user_id", userId).eq("brand_id", brandId).maybeSingle();
  if (error) throw new Error("Could not verify brand membership.");
  if (!data || (roles && !roles.includes(data.role))) throw new Error("FORBIDDEN");
  return data;
}
export async function audit(adminClient: SupabaseClient, input: {
  brand_id: string | null; actor_user_id: string | null; action: string; entity_type: string;
  entity_id?: string | null; outcome?: "success" | "failure" | "blocked"; metadata?: Record<string, unknown>;
}) {
  const { error } = await adminClient.from("audit_events").insert({
    brand_id: input.brand_id, actor_user_id: input.actor_user_id, action: input.action,
    entity_type: input.entity_type, entity_id: input.entity_id ?? null, outcome: input.outcome ?? "success",
    metadata: input.metadata ?? {},
  });
  if (error) console.error("audit_insert_failed", error.code);
}
export function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  if (message === "UNAUTHORIZED") return { status: 401, message: "Please sign in to continue." };
  if (message === "FORBIDDEN") return { status: 403, message: "You do not have permission to perform this action." };
  return { status: 400, message };
}
