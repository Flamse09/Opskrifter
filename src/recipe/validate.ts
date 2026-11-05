import { SOURCE_TYPES, type Ingredient, type RecipeInput, type SourceType, type Step } from './types.ts';

/** Kitchen equipment and consumables that must never become a shopping item. */
const EQUIPMENT_WORDS = [
  'ovn', 'pizzasten', 'pizzastål', 'bageplade', 'bagepapir', 'skål', 'røremaskine', 'foodprocessor', 'blender',
  'stavblender', 'gryde', 'pande', 'stegepande', 'kniv', 'skærebræt', 'pizzaskovl', 'dejskraber', 'kagerulle',
  'springform', 'bradepande', 'si', 'piskeris', 'termometer', 'vægt', 'film', 'husholdningsfilm', 'alufolie',
  'sølvpapir', 'plastfolie', 'køkkenrulle', 'grill', 'airfryer', 'wok', 'sprøjtepose', 'form', 'rist',
];

export function looksLikeEquipment(name: string): boolean {
  const n = name.toLowerCase().trim();
  const last = n.split(/\s+/).pop() ?? '';
  return EQUIPMENT_WORDS.some((w) => [n, last].some((x) => x === w || x === `${w}e` || x === `${w}r` || x === `${w}er`) || n.startsWith(`${w} `));
}

export interface ValidationResult {
  recipe?: RecipeInput;
  errors: string[];
  warnings: string[];
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : []);

/** Checks and normalises a recipe from untrusted JSON (the import script) or the edit form. */
export function validateRecipe(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') return { errors: ['Opskriften skal være et JSON-objekt.'], warnings };
  const r = raw as Record<string, unknown>;

  const title = str(r.title);
  if (!title) errors.push('title mangler.');

  const ingredients: Ingredient[] = [];
  const equipment = strList(r.equipment);
  if (!Array.isArray(r.ingredients)) errors.push('ingredients skal være en liste.');
  else
    r.ingredients.forEach((x, i) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const name = str(o.name);
      if (!name) return errors.push(`ingredients[${i}] mangler name.`);
      if (looksLikeEquipment(name)) {
        errors.push(`ingredients[${i}] "${name}" ligner udstyr. Flyt det til equipment.`);
        return;
      }
      const ing: Ingredient = { name };
      const group = str(o.group);
      if (group) ing.group = group;
      if (o.amount !== undefined && o.amount !== null) {
        const a = num(o.amount);
        if (a === null) errors.push(`ingredients[${i}] "${name}": amount skal være et positivt tal.`);
        else ing.amount = a;
      }
      const max = num(o.amount_max);
      if (max !== null) ing.amount_max = max;
      const unit = str(o.unit);
      if (unit) ing.unit = unit;
      const note = str(o.note);
      if (note) ing.note = note;
      if (o.optional === true) ing.optional = true;
      ingredients.push(ing);
    });
  if (Array.isArray(r.ingredients) && r.ingredients.length === 0) warnings.push('Opskriften har ingen ingredienser.');

  const steps: Step[] = [];
  if (!Array.isArray(r.steps)) errors.push('steps skal være en liste.');
  else
    r.steps.forEach((x, i) => {
      const o = (typeof x === 'string' ? { text: x } : (x ?? {})) as Record<string, unknown>;
      const text = str(o.text);
      if (!text) return errors.push(`steps[${i}] mangler text.`);
      const group = str(o.group);
      steps.push(group ? { group, text } : { text });
    });

  const sourceType = (str(r.source_type) ?? 'manual') as SourceType;
  if (!SOURCE_TYPES.includes(sourceType)) errors.push(`source_type skal være en af: ${SOURCE_TYPES.join(', ')}.`);
  const sourceUrl = str(r.source_url);
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) errors.push('source_url skal starte med http(s)://');
  if ((sourceType === 'web' || sourceType === 'video') && !sourceUrl) warnings.push('source_url mangler for en web- eller videoopskrift.');

  const servings = num(r.servings);
  if (!servings && !str(r.yield_text)) warnings.push('Hverken servings eller yield_text er sat, så opskriften kan ikke skaleres.');

  if (errors.length) return { errors, warnings };
  return {
    errors,
    warnings,
    recipe: {
      title: title!,
      description: str(r.description),
      category: str(r.category),
      tags: [...new Set(strList(r.tags).map((t) => t.toLowerCase()))],
      servings,
      yield_text: str(r.yield_text),
      prep_minutes: num(r.prep_minutes),
      cook_minutes: num(r.cook_minutes),
      total_minutes: num(r.total_minutes),
      ingredients,
      steps,
      equipment,
      notes: str(r.notes),
      flags: strList(r.flags),
      source_type: sourceType,
      source_url: sourceUrl,
      source_text: str(r.source_text),
      image_url: str(r.image_url),
      favorite: r.favorite === true,
    },
  };
}
