import { CATEGORIES, type Recipe } from './types.ts';

const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export interface Filter {
  query: string;
  category?: string;
  favoritesOnly?: boolean;
}

/**
 * Every word in the query must match the title, an ingredient, a tag or the category.
 * Title matches rank first, then favourites, then alphabetical.
 */
export function searchRecipes(recipes: Recipe[], f: Filter): Recipe[] {
  const words = fold(f.query).split(/\s+/).filter(Boolean);
  const hits = recipes.filter((r) => {
    if (r.deleted_at) return false;
    if (f.category && r.category !== f.category) return false;
    if (f.favoritesOnly && !r.favorite) return false;
    const hay = fold([r.title, r.category ?? '', ...r.tags, ...r.ingredients.map((i) => i.name)].join(' | '));
    return words.every((w) => hay.includes(w));
  });
  const titleHit = (r: Recipe) => words.length > 0 && words.every((w) => fold(r.title).includes(w));
  return hits.sort(
    (a, b) =>
      Number(titleHit(b)) - Number(titleHit(a)) ||
      Number(b.favorite) - Number(a.favorite) ||
      a.title.localeCompare(b.title, 'da'),
  );
}

/** Groups recipes by category in the fixed CATEGORIES order; unknown categories follow alphabetically, recipes without one go under "Andet". */
export function groupByCategory(recipes: Recipe[]): [string, Recipe[]][] {
  const groups = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const c = r.category || 'Andet';
    groups.set(c, [...(groups.get(c) ?? []), r]);
  }
  const rank = (c: string) => {
    if (c === 'Andet') return Infinity;
    const i = (CATEGORIES as readonly string[]).indexOf(c);
    return i === -1 ? CATEGORIES.length : i;
  };
  return [...groups].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'da'));
}
