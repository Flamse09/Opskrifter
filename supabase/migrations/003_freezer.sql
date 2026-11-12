-- Mise: what is in the freezer and since when. A row is deleted when it is used up.
-- Run once in Supabase → SQL Editor.

create table public.freezer_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  frozen_on date not null default current_date, -- the day it went into the freezer
  name text not null check (length(trim(name)) > 0),
  amount numeric check (amount is null or amount > 0),
  unit text,
  note text
);

create index freezer_items_household on public.freezer_items (household_id);

alter table public.freezer_items enable row level security;

create policy member_select on public.freezer_items for select to authenticated
  using (household_id = public.my_household_id());
create policy member_insert on public.freezer_items for insert to authenticated
  with check (household_id = public.my_household_id());
create policy member_update on public.freezer_items for update to authenticated
  using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
create policy member_delete on public.freezer_items for delete to authenticated
  using (household_id = public.my_household_id());

grant select, insert, update, delete on public.freezer_items to authenticated;

alter publication supabase_realtime add table public.freezer_items;
