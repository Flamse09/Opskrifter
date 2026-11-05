import type { Recipe } from './types.ts';

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
