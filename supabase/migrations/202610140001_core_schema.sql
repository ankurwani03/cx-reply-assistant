create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.member_role as enum ('admin', 'agent');
create type public.conversation_status as enum ('open', 'pending', 'closed');
create type public.sender_type as enum ('customer', 'agent', 'system');
create type public.message_status as enum ('sent', 'failed');
create type public.knowledge_category as enum ('returns', 'refunds', 'shipping', 'cancellations', 'general');
create type public.generation_status as enum ('generated', 'needs_review', 'edited', 'approved', 'sent', 'failed', 'blocked');

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_name_nonempty check (length(trim(name)) between 2 and 120)
);

create table public.brand_memberships (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'agent',
  created_at timestamptz not null default now(),
  unique (brand_id, user_id),
  unique (brand_id, id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, id),
  constraint customers_name_nonempty check (length(trim(display_name)) between 1 and 160)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  customer_id uuid not null,
  order_number text not null,
  product_name text not null,
  delivery_status text not null default 'unknown' check (delivery_status in ('unknown','processing','shipped','delivered','delayed','cancelled')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, id),
  unique (brand_id, order_number),
  foreign key (brand_id, customer_id) references public.customers(brand_id, id) on delete restrict
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  customer_id uuid not null,
  order_id uuid,
  subject text not null,
  status public.conversation_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, id),
  foreign key (brand_id, customer_id) references public.customers(brand_id, id) on delete restrict,
  foreign key (brand_id, order_id) references public.orders(brand_id, id) on delete restrict
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  conversation_id uuid not null,
  sender_type public.sender_type not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  status public.message_status not null default 'sent',
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (conversation_id, idempotency_key),
  unique (brand_id, id),
  unique (brand_id, conversation_id, id),
  foreign key (brand_id, conversation_id) references public.conversations(brand_id, id) on delete cascade,
  constraint messages_body_nonempty check (length(trim(body)) between 1 and 4000)
);

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  category public.knowledge_category not null,
  title text not null,
  content text not null,
  active boolean not null default true,
  search_vector tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, id),
  constraint knowledge_title_nonempty check (length(trim(title)) between 3 and 160),
  constraint knowledge_content_nonempty check (length(trim(content)) between 10 and 12000)
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null,
  conversation_id uuid not null,
  triggering_message_id uuid,
  model text not null,
  original_draft text,
  edited_draft text,
  final_text text,
  retrieved_context jsonb not null default '[]'::jsonb,
  knowledge_entry_ids uuid[] not null default '{}',
  status public.generation_status not null default 'generated',
  warning text,
  prompt_tokens integer,
  completion_tokens integer,
  estimated_cost_usd numeric(12,8),
  error_code text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  sent_message_id uuid,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, conversation_id, id),
  foreign key (brand_id, conversation_id) references public.conversations(brand_id, id) on delete cascade,
  foreign key (brand_id, conversation_id, triggering_message_id) references public.messages(brand_id, conversation_id, id) on delete restrict,
  foreign key (brand_id, sent_message_id) references public.messages(brand_id, id) on delete restrict,
  constraint generation_tokens_nonnegative check ((prompt_tokens is null or prompt_tokens >= 0) and (completion_tokens is null or completion_tokens >= 0))
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  outcome text not null default 'success' check (outcome in ('success','failure','blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.brand_memberships(user_id, brand_id);
create index customers_brand_idx on public.customers(brand_id);
create index orders_brand_customer_idx on public.orders(brand_id, customer_id);
create index conversations_brand_updated_idx on public.conversations(brand_id, updated_at desc);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index knowledge_brand_category_idx on public.knowledge_entries(brand_id, category, active);
create index knowledge_search_idx on public.knowledge_entries using gin(search_vector);
create index knowledge_title_trgm_idx on public.knowledge_entries using gin(title gin_trgm_ops);
create index generations_conversation_created_idx on public.ai_generations(conversation_id, created_at desc);
create index audit_brand_created_idx on public.audit_events(brand_id, created_at desc);

create or replace function public.is_brand_member(target_brand uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.brand_memberships m where m.brand_id = target_brand and m.user_id = auth.uid());
$$;

create or replace function public.has_brand_role(target_brand uuid, allowed_roles public.member_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.brand_memberships m where m.brand_id = target_brand and m.user_id = auth.uid() and m.role = any(allowed_roles));
$$;

revoke all on function public.is_brand_member(uuid) from public;
revoke all on function public.has_brand_role(uuid, public.member_role[]) from public;
grant execute on function public.is_brand_member(uuid) to authenticated;
grant execute on function public.has_brand_role(uuid, public.member_role[]) to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger brands_touch before update on public.brands for each row execute function public.touch_updated_at();
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations for each row execute function public.touch_updated_at();
create trigger knowledge_touch before update on public.knowledge_entries for each row execute function public.touch_updated_at();
create trigger generations_touch before update on public.ai_generations for each row execute function public.touch_updated_at();

alter table public.brands enable row level security;
alter table public.brand_memberships enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.ai_generations enable row level security;
alter table public.audit_events enable row level security;

create policy brands_read_member on public.brands for select to authenticated using (public.is_brand_member(id));
create policy memberships_read_self_or_admin on public.brand_memberships for select to authenticated using (user_id = auth.uid() or public.has_brand_role(brand_id, array['admin']::public.member_role[]));
create policy memberships_admin_manage on public.brand_memberships for all to authenticated using (public.has_brand_role(brand_id, array['admin']::public.member_role[])) with check (public.has_brand_role(brand_id, array['admin']::public.member_role[]));

create policy customers_read_member on public.customers for select to authenticated using (public.is_brand_member(brand_id));
create policy customers_agent_write on public.customers for insert to authenticated with check (public.has_brand_role(brand_id, array['admin','agent']::public.member_role[]));
create policy customers_admin_update on public.customers for update to authenticated using (public.has_brand_role(brand_id, array['admin']::public.member_role[])) with check (public.has_brand_role(brand_id, array['admin']::public.member_role[]));

create policy orders_read_member on public.orders for select to authenticated using (public.is_brand_member(brand_id));
create policy orders_admin_manage on public.orders for all to authenticated using (public.has_brand_role(brand_id, array['admin']::public.member_role[])) with check (public.has_brand_role(brand_id, array['admin']::public.member_role[]));

create policy conversations_read_member on public.conversations for select to authenticated using (public.is_brand_member(brand_id));
create policy conversations_member_insert on public.conversations for insert to authenticated with check (public.is_brand_member(brand_id));
create policy conversations_agent_update on public.conversations for update to authenticated using (public.has_brand_role(brand_id, array['admin','agent']::public.member_role[])) with check (public.has_brand_role(brand_id, array['admin','agent']::public.member_role[]));

create policy messages_read_member on public.messages for select to authenticated using (public.is_brand_member(brand_id));
create policy messages_member_insert on public.messages for insert to authenticated with check (public.has_brand_role(brand_id, array['admin','agent']::public.member_role[]));
create policy messages_no_client_update on public.messages for update to authenticated using (false) with check (false);
create policy messages_no_client_delete on public.messages for delete to authenticated using (false);

create policy knowledge_read_member on public.knowledge_entries for select to authenticated using (public.is_brand_member(brand_id));
create policy knowledge_admin_manage on public.knowledge_entries for all to authenticated using (public.has_brand_role(brand_id, array['admin']::public.member_role[])) with check (public.has_brand_role(brand_id, array['admin']::public.member_role[]));

create policy generations_read_member on public.ai_generations for select to authenticated using (public.is_brand_member(brand_id));
create policy generations_no_client_write on public.ai_generations for all to authenticated using (false) with check (false);

create policy audit_read_admin on public.audit_events for select to authenticated using (brand_id is not null and public.has_brand_role(brand_id, array['admin']::public.member_role[]));
create policy audit_no_client_write on public.audit_events for all to authenticated using (false) with check (false);

grant select on public.brands, public.brand_memberships, public.customers, public.orders, public.conversations, public.messages, public.knowledge_entries, public.ai_generations, public.audit_events to authenticated;
grant insert, update on public.customers, public.conversations to authenticated;
grant insert on public.messages to authenticated;
grant insert, update, delete on public.knowledge_entries to authenticated;
