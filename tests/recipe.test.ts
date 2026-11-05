import { describe, expect, it } from 'vitest';
import {
  formatIngredient,
  formatMinutes,
  ingredientsToText,
  parseIngredientLine,
  parseIngredientText,
  parseStepText,
  stepsToText,
} from '../src/recipe/ingredients.ts';
import { groupByCategory, searchRecipes } from '../src/recipe/search.ts';
import type { Recipe } from '../src/recipe/types.ts';
import { looksLikeEquipment, validateRecipe } from '../src/recipe/validate.ts';

describe('parseIngredientLine', () => {
  it.each([
    ['200 g hvedemel, tipo 00', { name: 'hvedemel', amount: 200, unit: 'g', note: 'tipo 00' }],
    ['1,5 dl vand', { name: 'vand', amount: 1.5, unit: 'dl' }],
    ['½ tsk salt', { name: 'salt', amount: 0.5, unit: 'tsk' }],
    ['1 1/2 spsk olie', { name: 'olie', amount: 1.5, unit: 'spsk' }],
    ['1½ spsk olie', { name: 'olie', amount: 1.5, unit: 'spsk' }],
    ['1-2 fed hvidløg', { name: 'hvidløg', amount: 1, amount_max: 2, unit: 'fed' }],
    ['2 store løg', { name: 'store løg', amount: 2 }],
    ['salt og peber', { name: 'salt og peber' }],
    ['1 chili (valgfri)', { name: 'chili', amount: 1, optional: true }],
    ['- 3 tsk. sukker', { name: 'sukker', amount: 3, unit: 'tsk' }],
  ])('%s', (line, expected) => {
    expect(parseIngredientLine(line)).toEqual(expected);
  });
});

describe('formatIngredient', () => {
  it('scales and formats Danish numbers', () => {
    expect(formatIngredient({ name: 'mel', amount: 250, unit: 'g' }, 2)).toBe('500 g mel');
    expect(formatIngredient({ name: 'vand', amount: 1.5, unit: 'dl' })).toBe('1½ dl vand');
    expect(formatIngredient({ name: 'gær', amount: 3.3, unit: 'g' })).toBe('3,3 g gær');
    expect(formatIngredient({ name: 'hvidløg', amount: 1, amount_max: 2, unit: 'fed', optional: true })).toBe('1-2 fed hvidløg (valgfri)');
  });
});

describe('text round trip', () => {
  it('keeps groups for ingredients', () => {
    const text = 'Dej:\n500 g mel\n3 g gær\n\nSauce:\n1 dåse tomater';
    const list = parseIngredientText(text);
    expect(list[0]).toEqual({ group: 'Dej', name: 'mel', amount: 500, unit: 'g' });
    expect(list[2].group).toBe('Sauce');
    expect(parseIngredientText(ingredientsToText(list))).toEqual(list);
  });
  it('keeps groups and numbering for steps', () => {
    const steps = parseStepText('1. Bland mel og vand.\n2. Ælt i 10 min.\n\nBagning:\nBag ved 250 °C.');
    expect(steps).toEqual([{ text: 'Bland mel og vand.' }, { text: 'Ælt i 10 min.' }, { group: 'Bagning', text: 'Bag ved 250 °C.' }]);
    expect(parseStepText(stepsToText(steps))).toEqual(steps);
  });
});

describe('validateRecipe', () => {
  const base = { title: 'Pizzadej', ingredients: [{ name: 'mel', amount: 500, unit: 'g' }], steps: ['Bland.'], servings: 4 };

  it('accepts a minimal recipe and fills defaults', () => {
    const r = validateRecipe(base);
    expect(r.errors).toEqual([]);
    expect(r.recipe).toMatchObject({ title: 'Pizzadej', steps: [{ text: 'Bland.' }], equipment: [], tags: [], source_type: 'manual' });
  });

  it('refuses equipment on the ingredient list', () => {
    const r = validateRecipe({ ...base, ingredients: [...base.ingredients, { name: 'Bagepapir' }, { name: 'pizzasten' }] });
    expect(r.recipe).toBeUndefined();
    expect(r.errors).toHaveLength(2);
  });

  it('does not mistake ingredients for equipment', () => {
    for (const n of ['pandekagemix', 'ovnbagte kartofler', 'sirup', 'grillpølser', 'formel']) expect(looksLikeEquipment(n)).toBe(false);
    for (const n of ['ovn', 'Skål', 'stor skål', 'gryder']) expect(looksLikeEquipment(n)).toBe(true);
  });

  it('reports bad types', () => {
    const r = validateRecipe({ title: '', ingredients: [{ name: 'mel', amount: -1 }], steps: 'x', source_type: 'tiktok' });
    expect(r.errors.length).toBe(4);
  });

  it('warns when the recipe cannot be scaled', () => {
    expect(validateRecipe({ ...base, servings: undefined }).warnings[0]).toMatch(/skaleres/);
  });
});

describe('searchRecipes', () => {
  const mk = (title: string, ingredients: string[], extra: Partial<Recipe> = {}): Recipe =>
    ({ id: title, title, ingredients: ingredients.map((name) => ({ name })), tags: [], favorite: false, deleted_at: null, ...extra }) as Recipe;
  const all = [
    mk('Kartoffelpizza', ['kartofler', 'rosmarin']),
    mk('Svampepizza', ['champignon', 'mozzarella'], { favorite: true }),
    mk('Kartoffelsuppe', ['kartofler', 'porre'], { category: 'Suppe' }),
    mk('Slettet', ['kartofler'], { deleted_at: '2026-01-01' }),
  ];

  it('matches title and ingredients, all words', () => {
    expect(searchRecipes(all, { query: 'kartofler' }).map((r) => r.title)).toEqual(['Kartoffelpizza', 'Kartoffelsuppe']);
    expect(searchRecipes(all, { query: 'kartofler porre' }).map((r) => r.title)).toEqual(['Kartoffelsuppe']);
  });

  it('ranks title hits first and favourites next', () => {
    expect(searchRecipes(all, { query: 'pizza' }).map((r) => r.title)).toEqual(['Svampepizza', 'Kartoffelpizza']);
    expect(searchRecipes(all, { query: '' })[0].title).toBe('Svampepizza');
  });

  it('filters on category and favourites', () => {
    expect(searchRecipes(all, { query: '', category: 'Suppe' })).toHaveLength(1);
    expect(searchRecipes(all, { query: '', favoritesOnly: true })).toHaveLength(1);
  });

  it('groups by category in fixed order, unknown after, none as Andet last', () => {
    const list = [
      mk('A', [], { category: 'Brød' }),
      mk('B', []),
      mk('C', [], { category: 'Grill' }),
      mk('D', [], { category: 'Aftensmad' }),
      mk('E', [], { category: 'Brød' }),
    ];
    expect(groupByCategory(list).map(([c, rs]) => `${c}:${rs.map((r) => r.title).join('')}`)).toEqual(['Aftensmad:D', 'Brød:AE', 'Grill:C', 'Andet:B']);
  });
});

describe('formatMinutes', () => {
  it('uses hours above an hour', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(90)).toBe('1 t 30 min');
    expect(formatMinutes(2880)).toBe('48 t');
  });
});
