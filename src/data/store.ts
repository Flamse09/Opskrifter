import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'preact/hooks';
import type { Recipe, RecipeInput } from '../recipe/types';
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
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'opskrifter.cache.v1';

function readCache(): Pick<State, 'household' | 'recipes'> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { household: null, recipes: [] };
}

function writeCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ household: state.household, recipes: state.recipes }));
  } catch {
    // ignore
  }
}

let state: State = { user: null, authReady: false, loading: false, error: null, ...readCache() };
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  if ('recipes' in patch || 'household' in patch) writeCache();
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
  const r = await supabase.from('recipes').select('*').is('deleted_at', null);
  if (r.error) return set({ loading: false, error: r.error.message });
  set({ household, recipes: r.data as Recipe[], loading: false });

  channel?.unsubscribe();
  channel = supabase
    .channel('recipes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `household_id=eq.${household.id}` }, (p) => {
      const row = p.new as Recipe;
      if (!row?.id) return;
      upsertLocal(row);
    })
    .subscribe();
}

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
      if (event === 'SIGNED_OUT') set({ household: null, recipes: [] });
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
