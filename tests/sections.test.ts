import { describe, expect, it } from 'vitest';
import { groupBySection, nameKey, sectionOf } from '../src/shopping/sections.ts';

describe('sectionOf', () => {
  it('places the ingredients from our recipes', () => {
    const cases: Record<string, string> = {
      sødmælk: 'Mejeri og æg',
      mascarpone: 'Mejeri og æg',
      'usaltet smør': 'Mejeri og æg',
      flødeost: 'Mejeri og æg',
      æggeblomme: 'Mejeri og æg',
      hvedemel: 'Bagning',
      'frisk gær': 'Bagning',
      'mørk farin': 'Bagning',
      muscovadosukker: 'Bagning',
      vaniljeekstrakt: 'Bagning',
      dåsetomater: 'Kolonial',
      'fint havsalt': 'Kolonial',
      'neutral olie': 'Kolonial',
      'stødt kanel': 'Kolonial',
      portobellosvamp: 'Frugt og grønt',
      'frisk rosmarin': 'Frugt og grønt',
      kartoffel: 'Frugt og grønt',
      hvidløg: 'Frugt og grønt',
      salami: 'Pålæg',
      'hakket oksekød': 'Kød og fisk',
    };
    for (const [name, section] of Object.entries(cases)) expect([name, sectionOf(name)]).toEqual([name, section]);
  });

  it('prefers the longest keyword and only matches at the start of a word', () => {
    expect(sectionOf('kartoffelmel')).toBe('Bagning');
    expect(sectionOf('mandler')).toBe('Kolonial'); // not "and"
    expect(sectionOf('melon')).toBe('Frugt og grønt'); // not "mel"
    expect(sectionOf('skuresvamp')).toBe('Husholdning'); // not "svamp"
    expect(sectionOf('chiliflager')).toBe('Kolonial');
    expect(sectionOf('Toiletpapir')).toBe('Husholdning');
    expect(sectionOf('noget helt andet')).toBe('Andet');
  });
});

describe('groupBySection', () => {
  it('keeps walking order and skips empty sections', () => {
    const groups = groupBySection([{ name: 'mælk' }, { name: 'bananer' }, { name: 'gaveæske' }, { name: 'ost' }]);
    expect(groups.map(([s, items]) => `${s}:${items.length}`)).toEqual(['Frugt og grønt:1', 'Mejeri og æg:2', 'Andet:1']);
  });
});

describe('chosen sections', () => {
  it('lets the household override the keyword list, by name and case-insensitive', () => {
    const overrides = { [nameKey('Gaveæske ')]: 'Husholdning', mascarpone: 'Kolonial', ost: 'Ikke en afdeling' };
    expect(sectionOf('gaveæske', overrides)).toBe('Husholdning');
    expect(sectionOf('Mascarpone', overrides)).toBe('Kolonial');
    expect(sectionOf('ost', overrides)).toBe('Mejeri og æg'); // unknown section names are ignored
    expect(groupBySection([{ name: 'gaveæske' }], overrides)[0][0]).toBe('Husholdning');
  });
});
