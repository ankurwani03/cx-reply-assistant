export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Brand = { id: string; name: string; slug: string };
export type Customer = { id: string; brand_id: string; display_name: string; email: string | null };
export type Order = { id: string; brand_id: string; customer_id: string; order_number: string; product_name: string; delivery_status: string; delivered_at: string | null };
export type Conversation = {
  id: string; brand_id: string; customer_id: string; order_id: string | null; subject: string;
  status: "open" | "pending" | "closed"; created_at: string; updated_at: string;
  brands?: Brand; customers?: Customer; orders?: Order | null;
};
export type Message = {
  id: string; brand_id: string; conversation_id: string; sender_type: "customer" | "agent" | "system";
  body: string; status: "sent" | "failed"; created_at: string; sender_user_id?: string | null;
};
export type KnowledgeEntry = {
  id: string; brand_id: string; category: "returns" | "refunds" | "shipping" | "cancellations" | "general";
  title: string; content: string; active: boolean; created_at: string; updated_at: string;
};
export type Generation = {
  id: string; brand_id: string; conversation_id: string; triggering_message_id: string | null;
  model: string; original_draft: string | null; edited_draft: string | null; final_text: string | null;
  retrieved_context: Json; knowledge_entry_ids: string[]; status: string; warning: string | null;
  prompt_tokens: number | null; completion_tokens: number | null; estimated_cost_usd: number | null; created_at: string;
};
