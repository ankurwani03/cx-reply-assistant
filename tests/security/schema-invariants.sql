-- Run against a local Supabase database after `supabase db reset`.
do $$
begin
  if (select count(*) from public.brands where slug in ('freshglow','purenest')) <> 2 then
    raise exception 'Expected two seeded fictional brands';
  end if;
  if (select count(distinct category) from public.knowledge_entries where brand_id = '10000000-0000-4000-8000-000000000001') < 4 then
    raise exception 'FreshGlow must have all four required policy categories';
  end if;
  if (select count(distinct category) from public.knowledge_entries where brand_id = '10000000-0000-4000-8000-000000000002') < 4 then
    raise exception 'PureNest must have all four required policy categories';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.conversations'::regclass) then
    raise exception 'RLS must be enabled on conversations';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.knowledge_entries'::regclass) then
    raise exception 'RLS must be enabled on knowledge entries';
  end if;
end $$;
