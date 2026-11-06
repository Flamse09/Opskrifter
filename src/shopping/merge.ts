import { formatAmount } from '../recipe/ingredients.ts';
import type { Ingredient } from '../recipe/types.ts';

export interface ShoppingItem {
  id: string;
  household_id: string;
  created_at: string;
  name: string;
  amount: number | null;
  unit: string | null;
  note: string | null;
  recipe_id: string | null;
  recipe_title: string | null;
  checked: boolean;
}

/** One line on the list: every unchecked (or every checked) row with the same name, added up. */
export interface MergedLine {
  key: string;
  name: string;
  qty: string; // "350 ml", "2 stk + 1 dåse", "" when no amounts are known
  exact?: string; // the unrounded amount when qty was rounded up, e.g. "1½"
  sources: string[]; // recipe titles; manual items are not listed
  notes: string[];
  ids: string[];
  checked: boolean;
}

// Units that convert into each other. Factor is relative to the base unit (first entry).
const DIMENSIONS: Record<string, Record<string, number>> = {
  mass: { g: 1, mg: 0.001, kg: 1000 },
  volume: { ml: 1, cl: 10, dl: 100, l: 1000 },
  spoon: { tsk: 1, spsk: 3 },
};
const SYNONYMS: Record<string, string> = { dåser: 'dåse', ds: 'dåse', pakker: 'pakke', pk: 'pakke', skiver: 'skive', stilke: 'stilk', håndfulde: 'håndfuld' };

function dimensionOf(unit: string): [string, number] | undefined {
  for (const [dim, units] of Object.entries(DIMENSIONS)) if (unit in units) return [dim, units[unit]];
  return undefined;
}

function formatDimension(dim: string, base: number): string {
  if (dim === 'mass') return base >= 1000 ? `${formatAmount(base / 1000)} kg` : `${formatAmount(base)} g`;
  if (dim === 'volume') {
    if (base >= 1000) return `${formatAmount(base / 1000)} l`;
    if (base >= 100 && base % 100 === 0) return `${formatAmount(base / 100)} dl`;
    return `${formatAmount(base)} ml`;
  }
  return base % 3 === 0 ? `${formatAmount(base / 3)} spsk` : `${formatAmount(base)} tsk`;
}

/** Adds up amounts. Weights and volumes are converted; things bought whole (stk, dåse, no unit) are rounded up. */
export function sumQuantity(rows: { amount: number | null; unit: string | null }[]): { qty: string; exact?: string } {
  const dims = new Map<string, number>();
  const counts = new Map<string, number>(); // unit ('' = none) → amount
  for (const r of rows) {
    if (r.amount == null) continue;
    const unit = (r.unit ?? '').toLowerCase();
    const d = dimensionOf(unit);
    if (d) dims.set(d[0], (dims.get(d[0]) ?? 0) + r.amount * d[1]);
    else {
      const u = SYNONYMS[unit] ?? unit;
      counts.set(u, (counts.get(u) ?? 0) + r.amount);
    }
  }
  const parts: string[] = [];
  const exactParts: string[] = [];
  let rounded = false;
  for (const dim of Object.keys(DIMENSIONS)) {
    const v = dims.get(dim);
    if (v !== undefined) {
      const s = formatDimension(dim, Math.round(v * 1000) / 1000);
      parts.push(s);
      exactParts.push(s);
    }
  }
  for (const [unit, v] of counts) {
    const whole = Math.ceil(v - 1e-9);
    if (whole !== v) rounded = true;
    parts.push(unit ? `${whole} ${unit}` : String(whole));
    exactParts.push(unit ? `${formatAmount(v)} ${unit}` : formatAmount(v));
  }
  return rounded ? { qty: parts.join(' + '), exact: exactParts.join(' + ') } : { qty: parts.join(' + ') };
}

const keyOf = (name: string) => name.trim().toLowerCase();

export function mergeItems(items: ShoppingItem[]): MergedLine[] {
  const groups = new Map<string, ShoppingItem[]>();
  for (const it of items) {
    const key = `${it.checked ? 1 : 0}|${keyOf(it.name)}`;
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const lines: MergedLine[] = [];
  for (const [key, rows] of groups) {
    const { qty, exact } = sumQuantity(rows);
    lines.push({
      key,
      name: rows[0].name.trim(),
      qty,
      ...(exact ? { exact } : {}),
      sources: [...new Set(rows.map((r) => r.recipe_title).filter((t): t is string => !!t))],
      notes: [...new Set(rows.map((r) => r.note).filter((n): n is string => !!n))],
      ids: rows.map((r) => r.id),
      checked: rows[0].checked,
    });
  }
  return lines.sort((a, b) => a.name.localeCompare(b.name, 'da'));
}

/** Never put on a shopping list. */
const NOT_BOUGHT = new Set(['vand', 'lunkent vand', 'koldt vand']);

/** Turns a recipe's ingredients into new list rows, scaled and without omitted ones. Ranges use the upper amount. */
export function rowsFromRecipe(ingredients: Ingredient[], factor: number, omitted: Set<number>) {
  return ingredients
    .filter((ing, i) => !omitted.has(i) && !NOT_BOUGHT.has(keyOf(ing.name)))
    .map((ing) => {
      const amount = ing.amount_max ?? ing.amount;
      return { name: ing.name, amount: amount === undefined ? null : Math.round(amount * factor * 1000) / 1000, unit: ing.unit ?? null };
    });
}
