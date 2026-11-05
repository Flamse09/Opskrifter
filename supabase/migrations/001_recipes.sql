-- Opskrifter: households, members and recipes with household-scoped RLS.
-- Runs in the same Supabase project as Spilscore (no table names overlap).
-- Run once in Supabase → SQL Editor.

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Vores køkken',
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id) -- one household per user
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  title text not null check (length(trim(title)) > 0),
  description text,
  category text,
  tags text[] not null default '{}',
  servings numeric check (servings is null or servings > 0),
  yield_text text,                 -- what one batch makes, e.g. "4 dejkugler"
  prep_minutes int,
  cook_minutes int,
  total_minutes int,
  ingredients jsonb not null default '[]'::jsonb,  -- [{group?, name, amount?, amount_max?, unit?, note?, optional?}]
  steps jsonb not null default '[]'::jsonb,        -- [{group?, text}]
  equipment text[] not null default '{}',          -- never goes on a shopping list
  notes text,
  flags text[] not null default '{}',              -- missing or unclear information found during import
  source_type text not null default 'manual' check (source_type in ('web', 'video', 'image', 'text', 'manual')),
  source_url text,
  source_text text,                                -- original imported content, kept for checking
  image_url text,
  favorite boolean not null default false
);

create index recipes_household on public.recipes (household_id) where deleted_at is null;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch_updated_at before update on public.recipes
  for each row execute function public.touch_updated_at();

-- Helper used by policies: the caller's household. security definer avoids RLS recursion on household_members.
create function public.my_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;

create policy member_select on public.households for select to authenticated
  using (id = public.my_household_id());
create policy member_update on public.households for update to authenticated
  using (id = public.my_household_id()) with check (id = public.my_household_id());

create policy member_select on public.household_members for select to authenticated
  using (household_id = public.my_household_id());

create policy member_select on public.recipes for select to authenticated
  using (household_id = public.my_household_id());
create policy member_insert on public.recipes for insert to authenticated
  with check (household_id = public.my_household_id());
create policy member_update on public.recipes for update to authenticated
  using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
-- No delete policy: the app soft-deletes via deleted_at.

-- Returns the caller's household, creating one on first use.
create function public.ensure_household() returns public.households
language plpgsql security definer set search_path = public as $$
declare
  h public.households;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select h2.* into h from public.households h2
    join public.household_members m on m.household_id = h2.id
    where m.user_id = auth.uid();
  if found then return h; end if;
  insert into public.households default values returning * into h;
  insert into public.household_members (household_id, user_id) values (h.id, auth.uid());
  return h;
end $$;

-- Moves the caller into the household with this invite code.
-- Refused if the caller's current household already has recipes, so nothing is orphaned silently.
create function public.join_household(code text) returns public.households
language plpgsql security definer set search_path = public as $$
declare
  target public.households;
  current_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into target from public.households where invite_code = upper(trim(code));
  if not found then raise exception 'Ukendt kode'; end if;
  select household_id into current_id from public.household_members where user_id = auth.uid();
  if current_id = target.id then return target; end if;
  if current_id is not null then
    if exists (select 1 from public.recipes where household_id = current_id and deleted_at is null) then
      raise exception 'Din nuværende husstand har opskrifter. Flyt dem først.';
    end if;
    delete from public.household_members where user_id = auth.uid();
    delete from public.households h where h.id = current_id
      and not exists (select 1 from public.household_members m where m.household_id = current_id);
  end if;
  insert into public.household_members (household_id, user_id) values (target.id, auth.uid());
  return target;
end $$;

revoke all on function public.ensure_household() from public, anon;
revoke all on function public.join_household(text) from public, anon;
revoke all on function public.my_household_id() from public, anon;
grant execute on function public.ensure_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.my_household_id() to authenticated;

grant select, update on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select, insert, update on public.recipes to authenticated;

-- Live updates so both phones see changes.
alter publication supabase_realtime add table public.recipes;
