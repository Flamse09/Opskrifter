-- Opskrifter: shared shopping list. One row per ingredient line; the app merges equal items when it shows the list.
-- Run once in Supabase → SQL Editor.

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  name text not null check (length(trim(name)) > 0),
  amount numeric,
  unit text,
  note text,
  recipe_id uuid references public.recipes(id) on delete set null,
  recipe_title text,               -- kept so the list still says where an item came from
  checked boolean not null default false
);

create index shopping_items_household on public.shopping_items (household_id);

alter table public.shopping_items enable row level security;

create policy member_select on public.shopping_items for select to authenticated
  using (household_id = public.my_household_id());
create policy member_insert on public.shopping_items for insert to authenticated
  with check (household_id = public.my_household_id());
create policy member_update on public.shopping_items for update to authenticated
  using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
create policy member_delete on public.shopping_items for delete to authenticated
  using (household_id = public.my_household_id());

grant select, insert, update, delete on public.shopping_items to authenticated;

alter publication supabase_realtime add table public.shopping_items;
