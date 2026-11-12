-- Mise: a permanent log of what was bought, so we can later see what goes on the list most.
-- A row is written when an item is ticked off and removed again if the tick is undone.
-- Clearing the list does not touch the history. Run once in Supabase → SQL Editor.

create table public.shopping_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  shopping_item_id uuid not null unique, -- no FK: list rows are deleted when the list is cleared
  bought_by uuid references auth.users(id) on delete set null,
  bought_at timestamptz not null default now(),
  name text not null,
  amount numeric,
  unit text,
  recipe_title text
);

create index shopping_history_household on public.shopping_history (household_id, bought_at desc);

alter table public.shopping_history enable row level security;
create policy member_select on public.shopping_history for select to authenticated
  using (household_id = public.my_household_id());
grant select on public.shopping_history to authenticated;
-- No insert/update/delete for users: only the trigger below writes here.

create function public.log_shopping_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.checked and not coalesce(old.checked, false) then
    insert into shopping_history (household_id, shopping_item_id, bought_by, name, amount, unit, recipe_title)
    values (new.household_id, new.id, auth.uid(), new.name, new.amount, new.unit, new.recipe_title)
    on conflict (shopping_item_id) do nothing;
  elsif old.checked and not new.checked then
    delete from shopping_history where shopping_item_id = new.id;
  end if;
  return new;
end $$;

create trigger log_shopping_history after insert or update of checked on public.shopping_items
  for each row execute function public.log_shopping_history();

-- Items already ticked off count too.
insert into public.shopping_history (household_id, shopping_item_id, name, amount, unit, recipe_title)
select household_id, id, name, amount, unit, recipe_title from public.shopping_items where checked
on conflict (shopping_item_id) do nothing;
