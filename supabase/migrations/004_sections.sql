-- Mise: store sections the household has chosen for an item, so "gaveæske" stays in Husholdning next time too.
-- Run once in Supabase → SQL Editor.

create table public.section_overrides (
  household_id uuid not null references public.households(id) on delete cascade,
  name_key text not null,          -- lower-case, trimmed item name
  section text not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, name_key)
);

alter table public.section_overrides enable row level security;

create policy member_select on public.section_overrides for select to authenticated
  using (household_id = public.my_household_id());
create policy member_insert on public.section_overrides for insert to authenticated
  with check (household_id = public.my_household_id());
create policy member_update on public.section_overrides for update to authenticated
  using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
create policy member_delete on public.section_overrides for delete to authenticated
  using (household_id = public.my_household_id());

grant select, insert, update, delete on public.section_overrides to authenticated;

alter publication supabase_realtime add table public.section_overrides;
