import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'preact/hooks';
import type { Recipe, RecipeInput } from '../recipe/types';
import type { ShoppingItem } from '../shopping/merge';
import type { FreezerItem } from '../freezer/freezer';
import { nameKey, type Overrides } from '../shopping/sections';
import { supabase } from './supabase';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
}

interface State {
  user: { id: string; email: string } | null;
  authReady: boolean;
  household: Household | null;
  recipes: Recipe[];
  shopping: ShoppingItem[];
  freezer: FreezerItem[];
  sections: Overrides; // store sections the household has chosen, by item name key
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'opskrifter.cache.v1';

function readCache(): Pick<State, 'household' | 'recipes' | 'shopping' | 'freezer' | 'sections'> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { shopping: [], freezer: [], sections: {}, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { household: null, recipes: [], shopping: [], freezer: [], sections: {} };
}

function writeCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ household: state.household, recipes: state.recipes, shopping: state.shopping, freezer: state.freezer, sections: state.sections }));
  } catch {
    // ignore
  }
}

let state: State = { user: null, authReady: false, loading: false, error: null, ...readCache() };
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  if ('recipes' in patch || 'household' in patch || 'shopping' in patch || 'freezer' in patch || 'sections' in patch) writeCache();
  listeners.forEach((l) => l());
}

export function useStore(): State {
  const [, setSnap] = useState(state);
  useEffect(() => {
    const l = () => setSnap(state);
    listeners.add(l);
    l(); // catch changes made between render and subscribe (e.g. the initial auth event)
    return () => void listeners.delete(l);
  }, []);
  return state;
}

let channel: RealtimeChannel | null = null;

/** Loads the household and all its recipes, then listens for changes from the other phone. */
async function load() {
  set({ loading: true, error: null });
  const h = await supabase.rpc('ensure_household');
  if (h.error) return set({ loading: false, error: h.error.message });
  const household = h.data as Household;
  const [r, sh, fr, so] = await Promise.all([
    supabase.from('recipes').select('*').is('deleted_at', null),
    supabase.from('shopping_items').select('*').order('created_at'),
    supabase.from('freezer_items').select('*'),
    supabase.from('section_overrides').select('name_key, section'),
  ]);
  if (r.error) return set({ loading: false, error: r.error.message });
  // A table from a newer migration may not exist yet; the rest still works without it.
  set({
    household,
    recipes: r.data as Recipe[],
    shopping: sh.error ? state.shopping : (sh.data as ShoppingItem[]),
    freezer: fr.error ? state.freezer : (fr.data as FreezerItem[]),
    sections: so.error ? state.sections : Object.fromEntries((so.data as { name_key: string; section: string }[]).map((x) => [x.name_key, x.section])),
    loading: false,
  });

  channel?.unsubscribe();
  channel = supabase
    .channel('household')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `household_id=eq.${household.id}` }, (p) => {
      const row = p.new as Recipe;
      if (!row?.id) return;
      upsertLocal(row);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, (p) => {
      if (p.eventType === 'DELETE') {
        const id = (p.old as { id?: string }).id;
        if (id) set({ shopping: state.shopping.filter((x) => x.id !== id) });
        return;
      }
      const row = p.new as ShoppingItem;
      if (row?.id && row.household_id === household.id) set({ shopping: [...state.shopping.filter((x) => x.id !== row.id), row] });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'section_overrides' }, (p) => {
      const row = p.new as { household_id?: string; name_key?: string; section?: string };
      if (row?.name_key && row.section && row.household_id === household.id) set({ sections: { ...state.sections, [row.name_key]: row.section } });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'freezer_items' }, (p) => {
      if (p.eventType === 'DELETE') {
        const id = (p.old as { id?: string }).id;
        if (id) set({ freezer: state.freezer.filter((x) => x.id !== id) });
        return;
      }
      const row = p.new as FreezerItem;
      if (row?.id && row.household_id === household.id) set({ freezer: [...state.freezer.filter((x) => x.id !== row.id), row] });
    })
    .subscribe();
}

let inFlight: Promise<void> | null = null;
/** Refetches everything (and reconnects live updates). Concurrent calls share one fetch. */
export function refresh(): Promise<void> {
  if (!state.user) return Promise.resolve();
  inFlight ??= load().finally(() => (inFlight = null));
  return inFlight;
}

let updateHandler: () => Promise<unknown> = refresh;
export const setUpdateHandler = (h: () => Promise<unknown>) => (updateHandler = h);
/** The ↻ button: installs a waiting app version, otherwise refetches data. */
export const runUpdate = () => updateHandler();

function upsertLocal(row: Recipe) {
  const rest = state.recipes.filter((x) => x.id !== row.id);
  set({ recipes: row.deleted_at ? rest : [...rest, row] });
}

export function startStore() {
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session ? { id: session.user.id, email: session.user.email ?? '' } : null;
    const changed = user?.id !== state.user?.id;
    set({ user, authReady: true });
    if (!user) {
      channel?.unsubscribe();
      channel = null;
      if (event === 'SIGNED_OUT') set({ household: null, recipes: [], shopping: [], freezer: [], sections: {} });
    } else if (changed) {
      // Defer: calling Supabase inside this callback can deadlock the auth lock.
      setTimeout(() => void load(), 0);
    }
  });
  window.addEventListener('online', () => state.user && void load());
}

export const reload = load;

/** Creates (no id) or updates a recipe. Returns the saved recipe or throws a Danish message. */
export async function saveRecipe(input: RecipeInput, id?: string): Promise<Recipe> {
  if (!state.household) throw new Error('Ingen husstand indlæst endnu.');
  const q = id
    ? supabase.from('recipes').update(input).eq('id', id)
    : supabase.from('recipes').insert({ ...input, household_id: state.household.id });
  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  upsertLocal(data as Recipe);
  return data as Recipe;
}

export async function setFavorite(id: string, favorite: boolean) {
  const { data, error } = await supabase.from('recipes').update({ favorite }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  upsertLocal(data as Recipe);
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from('recipes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  set({ recipes: state.recipes.filter((r) => r.id !== id) });
}

export async function joinHousehold(code: string): Promise<string | null> {
  const { error } = await supabase.rpc('join_household', { code });
  if (error) return error.message === 'Ukendt kode' ? 'Koden findes ikke.' : error.message;
  await load();
  return null;
}

// ---------- Shopping list ----------

type NewRow = { name: string; amount: number | null; unit: string | null; note?: string | null };

function newItem(row: NewRow, recipe?: { id: string; title: string }): ShoppingItem {
  return {
    id: crypto.randomUUID(),
    household_id: state.household!.id,
    created_at: new Date().toISOString(),
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    note: row.note ?? null,
    recipe_id: recipe?.id ?? null,
    recipe_title: recipe?.title ?? null,
    checked: false,
  };
}

/** Shows the change at once and writes it in the background; on failure the list is refetched. */
async function optimistic(next: ShoppingItem[], write: () => PromiseLike<{ error: { message: string } | null }>) {
  await optimisticPatch({ shopping: next }, write);
}

async function optimisticPatch(patch: Partial<State>, write: () => PromiseLike<{ error: { message: string } | null }>) {
  set({ ...patch, error: null });
  const { error } = await write();
  if (error) {
    set({ error: error.message });
    await refresh();
  }
}

export async function addShoppingRows(rows: NewRow[], recipe?: { id: string; title: string }) {
  if (!state.household) throw new Error('Ingen husstand indlæst endnu.');
  const items = rows.map((r) => newItem(r, recipe));
  await optimistic([...state.shopping, ...items], () => supabase.from('shopping_items').insert(items));
  return items.length;
}

export async function setChecked(ids: string[], checked: boolean) {
  const idSet = new Set(ids);
  await optimistic(
    state.shopping.map((x) => (idSet.has(x.id) ? { ...x, checked } : x)),
    () => supabase.from('shopping_items').update({ checked }).in('id', ids),
  );
}

export async function removeShopping(ids: string[]) {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  await optimistic(
    state.shopping.filter((x) => !idSet.has(x.id)),
    () => supabase.from('shopping_items').delete().in('id', ids),
  );
}

// ---------- Freezer ----------

type NewFreezerItem = { name: string; amount: number | null; unit: string | null; note?: string | null; frozen_on: string };

export async function addFreezerItem(row: NewFreezerItem) {
  if (!state.household) throw new Error('Ingen husstand indlæst endnu.');
  const item: FreezerItem = { id: crypto.randomUUID(), household_id: state.household.id, created_at: new Date().toISOString(), note: null, ...row };
  await optimisticPatch({ freezer: [...state.freezer, item] }, () => supabase.from('freezer_items').insert(item));
}

export async function setFreezerAmount(id: string, amount: number) {
  await optimisticPatch(
    { freezer: state.freezer.map((x) => (x.id === id ? { ...x, amount } : x)) },
    () => supabase.from('freezer_items').update({ amount }).eq('id', id),
  );
}

export async function removeFreezerItem(id: string) {
  await optimisticPatch({ freezer: state.freezer.filter((x) => x.id !== id) }, () => supabase.from('freezer_items').delete().eq('id', id));
}

// ---------- Store sections ----------

/** Remembers which store section an item belongs to, for this household. */
export async function setSection(name: string, section: string) {
  if (!state.household) throw new Error('Ingen husstand indlæst endnu.');
  const key = nameKey(name);
  const household_id = state.household.id;
  await optimisticPatch({ sections: { ...state.sections, [key]: section } }, () =>
    supabase.from('section_overrides').upsert({ household_id, name_key: key, section, updated_at: new Date().toISOString() }),
  );
}
