// Saves recipes to the shared household as the signed-in user (RLS applies; no service key).
//
//   node scripts/add-recipe.ts add recipe.json [--dry-run] [--force]
//   node scripts/add-recipe.ts update <id> recipe.json
//   node scripts/add-recipe.ts list [search]
//   node scripts/add-recipe.ts get <id>
//
// Needs .env (VITE_SUPABASE_URL, VITE_SUPABASE_KEY) and .env.local (OPSKRIFTER_EMAIL, OPSKRIFTER_PASSWORD).
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { validateRecipe } from '../src/recipe/validate.ts';

const root = new URL('..', import.meta.url);
for (const f of ['.env', '.env.local']) {
  const p = new URL(f, root);
  if (existsSync(p)) process.loadEnvFile(p);
}

const [cmd, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const args = rest.filter((a) => !a.startsWith('--'));

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function readRecipe(path: string | undefined) {
  if (!path) fail('Angiv en JSON-fil.');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    fail(`Kunne ikke læse ${path}: ${(e as Error).message}`);
  }
  const v = validateRecipe(raw);
  for (const w of v.warnings) console.warn(`Advarsel: ${w}`);
  if (!v.recipe) fail(`Opskriften blev afvist:\n- ${v.errors.join('\n- ')}`);
  return v.recipe;
}

async function connect() {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_KEY: key, OPSKRIFTER_EMAIL: email, OPSKRIFTER_PASSWORD: password } = process.env;
  if (!url || !key) fail('VITE_SUPABASE_URL/VITE_SUPABASE_KEY mangler i .env.');
  if (!email || !password) fail('OPSKRIFTER_EMAIL/OPSKRIFTER_PASSWORD mangler i .env.local. Frederik skal selv skrive dem ind.');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) fail(`Login fejlede: ${error.message}`);
  const h = await db.rpc('ensure_household');
  if (h.error) fail(`Husstand: ${h.error.message}`);
  return { db, householdId: (h.data as { id: string }).id };
}

const usage = 'Brug: add <fil.json> [--dry-run] [--force] | update <id> <fil.json> | list [søg] | get <id>';

switch (cmd) {
  case 'add': {
    const recipe = readRecipe(args[0]);
    if (flags.has('--dry-run')) {
      console.log(JSON.stringify(recipe, null, 2));
      console.log('OK (dry run, intet gemt).');
      break;
    }
    const { db, householdId } = await connect();
    if (!flags.has('--force')) {
      const { data } = await db.from('recipes').select('id, title, source_url').is('deleted_at', null);
      const dupe = data?.find(
        (r) => r.title.toLowerCase() === recipe.title.toLowerCase() || (recipe.source_url && r.source_url === recipe.source_url),
      );
      if (dupe) fail(`Findes måske allerede: "${dupe.title}" (${dupe.id}). Brug update, eller --force for at gemme alligevel.`);
    }
    const { data, error } = await db.from('recipes').insert({ ...recipe, household_id: householdId }).select('id, title').single();
    if (error) fail(error.message);
    console.log(`Gemt: "${data.title}" (${data.id})`);
    break;
  }
  case 'update': {
    const [id, file] = args;
    if (!id) fail(usage);
    const recipe = readRecipe(file);
    const { db } = await connect();
    const { data, error } = await db.from('recipes').update(recipe).eq('id', id).select('id, title').single();
    if (error) fail(error.message);
    console.log(`Opdateret: "${data.title}" (${data.id})`);
    break;
  }
  case 'list': {
    const { db } = await connect();
    let q = db.from('recipes').select('id, title, category').is('deleted_at', null).order('title');
    if (args[0]) q = q.ilike('title', `%${args[0]}%`);
    const { data, error } = await q;
    if (error) fail(error.message);
    for (const r of data) console.log(`${r.id}  ${r.title}${r.category ? `  [${r.category}]` : ''}`);
    console.log(`${data.length} opskrifter.`);
    break;
  }
  case 'get': {
    if (!args[0]) fail(usage);
    const { db } = await connect();
    const { data, error } = await db.from('recipes').select('*').eq('id', args[0]).single();
    if (error) fail(error.message);
    console.log(JSON.stringify(data, null, 2));
    break;
  }
  default:
    fail(usage);
}
