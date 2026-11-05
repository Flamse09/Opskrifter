import { useState } from 'preact/hooks';
import { deleteRecipe, saveRecipe, useStore } from '../../data/store';
import { ingredientsToText, parseIngredientText, parseStepText, stepsToText } from '../../recipe/ingredients';
import { CATEGORIES, type Recipe } from '../../recipe/types';
import { validateRecipe } from '../../recipe/validate';
import { href, navigate } from '../router';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const optNum = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : undefined);

function initial(r?: Recipe) {
  return {
    title: r?.title ?? '',
    description: r?.description ?? '',
    category: r?.category ?? '',
    tags: r?.tags.join(', ') ?? '',
    servings: r?.servings?.toString() ?? '',
    yield_text: r?.yield_text ?? '',
    prep_minutes: r?.prep_minutes?.toString() ?? '',
    cook_minutes: r?.cook_minutes?.toString() ?? '',
    total_minutes: r?.total_minutes?.toString() ?? '',
    ingredients: r ? ingredientsToText(r.ingredients) : '',
    steps: r ? stepsToText(r.steps) : '',
    equipment: r?.equipment.join('\n') ?? '',
    notes: r?.notes ?? '',
    flags: r?.flags.join('\n') ?? '',
    source_url: r?.source_url ?? '',
    image_url: r?.image_url ?? '',
  };
}

export function RecipeEdit({ id }: { id?: string }) {
  const { recipes } = useStore();
  const existing = id ? recipes.find((r) => r.id === id) : undefined;
  const [f, setF] = useState(() => initial(existing));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (id && !existing) return <p class="muted">Opskriften findes ikke.</p>;

  const field = (k: keyof typeof f) => ({
    value: f[k],
    onInput: (e: Event) => setF({ ...f, [k]: (e.currentTarget as HTMLInputElement).value }),
  });

  async function save(e: Event) {
    e.preventDefault();
    const v = validateRecipe({
      title: f.title,
      description: f.description,
      category: f.category,
      tags: f.tags.split(','),
      servings: optNum(f.servings),
      yield_text: f.yield_text,
      prep_minutes: optNum(f.prep_minutes),
      cook_minutes: optNum(f.cook_minutes),
      total_minutes: optNum(f.total_minutes),
      ingredients: parseIngredientText(f.ingredients),
      steps: parseStepText(f.steps),
      equipment: lines(f.equipment),
      notes: f.notes,
      flags: lines(f.flags),
      source_type: existing?.source_type ?? 'manual',
      source_url: f.source_url,
      source_text: existing?.source_text,
      image_url: f.image_url,
      favorite: existing?.favorite ?? false,
    });
    if (!v.recipe) return setErrors(v.errors);
    setBusy(true);
    try {
      const saved = await saveRecipe(v.recipe, id);
      navigate({ name: 'recipe', id: saved.id }, true);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !confirm(`Slet "${existing?.title}"?`)) return;
    await deleteRecipe(id);
    navigate({ name: 'home' }, true);
  }

  return (
    <form class="edit stack" onSubmit={save}>
      <h2>{id ? 'Rediger opskrift' : 'Ny opskrift'}</h2>
      <label>
        Titel
        <input required {...field('title')} />
      </label>
      <label>
        Kort beskrivelse
        <textarea rows={2} {...field('description')} />
      </label>
      <div class="grid2">
        <label>
          Kategori
          <select {...field('category')} onChange={(e) => setF({ ...f, category: e.currentTarget.value })}>
            <option value="">Ingen</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
            {f.category && !(CATEGORIES as readonly string[]).includes(f.category) && <option>{f.category}</option>}
          </select>
        </label>
        <label>
          Tags (komma)
          <input {...field('tags')} placeholder="vegetar, hurtig" />
        </label>
        <label>
          Portioner
          <input inputMode="decimal" {...field('servings')} placeholder="4" />
        </label>
        <label>
          Giver
          <input {...field('yield_text')} placeholder="fx 4 dejkugler" />
        </label>
      </div>
      <div class="grid3">
        <label>
          Forb. min
          <input inputMode="numeric" {...field('prep_minutes')} />
        </label>
        <label>
          Tilb. min
          <input inputMode="numeric" {...field('cook_minutes')} />
        </label>
        <label>
          I alt min
          <input inputMode="numeric" {...field('total_minutes')} />
        </label>
      </div>
      <label>
        Ingredienser
        <span class="hint">Én pr. linje, fx "200 g mel, tipo 00". En linje der slutter med ":" starter en gruppe.</span>
        <textarea rows={10} {...field('ingredients')} />
      </label>
      <label>
        Fremgangsmåde
        <span class="hint">Tom linje mellem trinene.</span>
        <textarea rows={10} {...field('steps')} />
      </label>
      <label>
        Udstyr
        <span class="hint">Én pr. linje. Kommer aldrig på indkøbslisten.</span>
        <textarea rows={3} {...field('equipment')} />
      </label>
      <label>
        Noter
        <textarea rows={3} {...field('notes')} />
      </label>
      <label>
        Uklarheder
        <span class="hint">Én pr. linje. Slet dem, når de er afklaret.</span>
        <textarea rows={2} {...field('flags')} />
      </label>
      <label>
        Link til kilde
        <input type="url" {...field('source_url')} />
      </label>
      <label>
        Billede (URL)
        <input type="url" {...field('image_url')} />
      </label>

      {errors.length > 0 && (
        <ul class="warn">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <button type="submit" class="primary big" disabled={busy}>
        Gem
      </button>
      <a class="button" href={id ? href({ name: 'recipe', id }) : href({ name: 'home' })}>
        Annullér
      </a>
      {id && (
        <button type="button" class="danger" onClick={remove}>
          Slet opskrift
        </button>
      )}
    </form>
  );
}
