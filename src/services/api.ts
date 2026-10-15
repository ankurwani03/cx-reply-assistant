import { supabase } from "../lib/supabase";
import type { Brand, Conversation, Generation, KnowledgeEntry, Message } from "../types/database";
import type { KnowledgeForm } from "../validation/schemas";

export async function listBrands(): Promise<Brand[]> {
  const { data, error } = await supabase.from("brands").select("id,name,slug").order("name");
  if (error) throw error;
  return data as Brand[];
}
export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.from("conversations")
    .select("id,brand_id,customer_id,order_id,subject,status,created_at,updated_at,brands(id,name,slug),customers(id,brand_id,display_name,email),orders(id,brand_id,customer_id,order_number,product_name,delivery_status,delivered_at)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Conversation[];
}
export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at");
  if (error) throw error;
  return (data ?? []) as Message[];
}
export async function sendMessage(conversationId: string, body: string, senderType: "customer" | "agent", idempotencyKey: string) {
  const { data, error } = await supabase.functions.invoke("send-message", {
    body: { conversationId, body, senderType, idempotencyKey }
  });
  if (error) throw error;
  if (!data?.message) throw new Error(data?.error || "Message was not saved.");
  return data.message as Message;
}
export async function generateReply(conversationId: string, triggeringMessageId?: string) {
  const { data, error } = await supabase.functions.invoke("generate-reply", {
    body: { conversationId, triggeringMessageId }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { generation: Generation; draft: string; knowledge: KnowledgeEntry[]; warning: string | null };
}
export async function saveGenerationEdit(generationId: string, editedDraft: string) {
  const { data, error } = await supabase.functions.invoke("manage-draft", {
    body: { action: "edit", generationId, editedDraft }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function approveGeneration(generationId: string) {
  const { data, error } = await supabase.functions.invoke("manage-draft", { body: { action: "approve", generationId } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function sendGeneration(generationId: string, conversationId: string, body: string, idempotencyKey: string) {
  const { data, error } = await supabase.functions.invoke("manage-draft", {
    body: { action: "send", generationId, conversationId, body, idempotencyKey }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function listKnowledge(brandId: string): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase.from("knowledge_entries").select("*").eq("brand_id", brandId).order("category").order("title");
  if (error) throw error;
  return (data ?? []) as KnowledgeEntry[];
}
export async function saveKnowledge(entry: KnowledgeForm, id?: string) {
  const query = id
    ? supabase.from("knowledge_entries").update({ ...entry }).eq("id", id).select().single()
    : supabase.from("knowledge_entries").insert(entry).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data as KnowledgeEntry;
}
export async function deleteKnowledge(id: string) {
  const { error } = await supabase.from("knowledge_entries").delete().eq("id", id);
  if (error) throw error;
}
