import { describe, expect, it } from 'vitest';
import { mergeItems, rowsFromRecipe, sumQuantity, type ShoppingItem } from '../src/shopping/merge.ts';

let n = 0;
const item = (name: string, amount: number | null, unit: string | null, extra: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: String(++n),
  household_id: 'h',
  created_at: '',
  name,
  amount,
  unit,
  note: null,
  recipe_id: null,
  recipe_title: null,
  checked: false,
  ...extra,
});

describe('sumQuantity', () => {
  it('adds and converts volumes and weights', () => {
    expect(sumQuantity([{ amount: 250, unit: 'ml' }, { amount: 60, unit: 'ml' }, { amount: 40, unit: 'ml' }]).qty).toBe('350 ml');
    expect(sumQuantity([{ amount: 2, unit: 'dl' }, { amount: 100, unit: 'ml' }]).qty).toBe('3 dl');
    expect(sumQuantity([{ amount: 780, unit: 'g' }, { amount: 0.6, unit: 'kg' }]).qty).toBe('1,38 kg');
    expect(sumQuantity([{ amount: 2, unit: 'tsk' }, { amount: 1, unit: 'spsk' }]).qty).toBe('5 tsk');
  });

  it('rounds things bought whole up and keeps the exact amount', () => {
    expect(sumQuantity([{ amount: 0.5, unit: null }, { amount: 0.5, unit: null }])).toEqual({ qty: '1' });
    expect(sumQuantity([{ amount: 1, unit: 'stk' }, { amount: 0.5, unit: 'stk' }])).toEqual({ qty: '2 stk', exact: '1½ stk' });
  });

  it('lists units that cannot be converted side by side', () => {
    expect(sumQuantity([{ amount: 1, unit: 'bundt' }, { amount: 20, unit: 'g' }]).qty).toBe('20 g + 1 bundt');
    expect(sumQuantity([{ amount: 1, unit: 'dåse' }, { amount: 2, unit: 'dåser' }]).qty).toBe('3 dåse');
    expect(sumQuantity([{ amount: null, unit: null }]).qty).toBe('');
  });
});

describe('mergeItems', () => {
  it('merges the same item across recipes, case-insensitive, and keeps checked items apart', () => {
    const lines = mergeItems([
      item('Sødmælk', 250, 'ml', { recipe_title: 'Kanelsnegle' }),
      item('sødmælk', 60, 'ml', { recipe_title: 'Kanelsnegle' }),
      item('sødmælk', 1, 'l', { recipe_title: 'Pandekager' }),
      item('sødmælk', 1, 'l', { checked: true }),
      item('æg', 2, 'stk'),
    ]);
    expect(lines.map((l) => [l.name, l.qty, l.checked, l.sources.join('/')])).toEqual([
      ['Sødmælk', '1,31 l', false, 'Kanelsnegle/Pandekager'],
      ['sødmælk', '1 l', true, ''],
      ['æg', '2 stk', false, ''],
    ]);
    expect(lines[0].ids).toHaveLength(3);
  });
});

describe('rowsFromRecipe', () => {
  it('scales, skips water and omitted ingredients, and uses the upper end of ranges', () => {
    const rows = rowsFromRecipe(
      [
        { name: 'vand', amount: 500, unit: 'g' },
        { name: 'hvidløg', amount: 1, amount_max: 2, unit: 'fed' },
        { name: 'rosmarin', optional: true },
        { name: 'flagesalt' },
      ],
      2,
      new Set([2]),
    );
    expect(rows).toEqual([
      { name: 'hvidløg', amount: 4, unit: 'fed' },
      { name: 'flagesalt', amount: null, unit: null },
    ]);
  });
});
