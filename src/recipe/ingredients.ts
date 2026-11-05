import type { Ingredient, Step } from './types.ts';

const UNITS = [
  'kg', 'g', 'mg', 'l', 'dl', 'cl', 'ml', 'tsk', 'spsk', 'knsp', 'nip', 'stk', 'fed', 'dåse', 'dåser', 'ds',
  'pakke', 'pakker', 'pk', 'bundt', 'håndfuld', 'håndfulde', 'skive', 'skiver', 'kop', 'kopper', 'glas', 'stilk', 'stilke',
];

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

/** "1,5" | "1/2" | "½" | "1½" | "1 1/2" → number. */
function parseNumber(s: string): number | undefined {
  s = s.trim().replace(',', '.');
  const mixed = s.match(/^(\d+)\s*([½¼¾⅓⅔])$/) ?? s.match(/^(\d+)\s+(\d+\/\d+)$/);
  if (mixed) {
    const rest = parseNumber(mixed[2]);
    return rest === undefined ? undefined : Number(mixed[1]) + rest;
  }
  if (s in FRACTIONS) return FRACTIONS[s];
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : undefined;
}

const NUM = String.raw`\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔]|\s+\d+\/\d+)?|\d+\/\d+|[½¼¾⅓⅔]`;
const LINE = new RegExp(String.raw`^(${NUM})(?:\s*[-–]\s*(${NUM}))?\s*(.*)$`);

/** Parses one line like "200 g hvedemel, tipo 00" or "1-2 fed hvidløg (valgfri)". */
export function parseIngredientLine(line: string, group?: string): Ingredient {
  let text = line.trim().replace(/^[-•*]\s*/, '');
  const ing: Ingredient = { name: '' };
  if (group) ing.group = group;

  if (/\(?\bvalgfri(t)?\b\)?/i.test(text)) {
    ing.optional = true;
    text = text.replace(/\s*\(?\bvalgfri(t)?\b\)?\s*/i, ' ').trim();
  }

  const m = text.match(LINE);
  if (m) {
    const amount = parseNumber(m[1]);
    const max = m[2] ? parseNumber(m[2]) : undefined;
    if (amount !== undefined) {
      ing.amount = amount;
      if (max !== undefined) ing.amount_max = max;
      text = m[3];
      const unitMatch = text.match(/^(\S+)\.?\s+(.*)$/);
      if (unitMatch && UNITS.includes(unitMatch[1].toLowerCase().replace(/\.$/, ''))) {
        ing.unit = unitMatch[1].toLowerCase().replace(/\.$/, '');
        text = unitMatch[2];
      }
    }
  }

  const comma = text.indexOf(',');
  if (comma > 0) {
    ing.note = text.slice(comma + 1).trim() || undefined;
    text = text.slice(0, comma);
  }
  ing.name = text.trim();
  if (!ing.note) delete ing.note;
  return ing;
}

/** Danish number formatting: 1.5 → "1,5", 0.5 → "½". */
export function formatAmount(n: number): string {
  const whole = Math.floor(n);
  const frac = n - whole;
  if (n < 10) {
    for (const [sym, val] of Object.entries(FRACTIONS)) {
      if (Math.abs(frac - val) < 0.01) return whole ? `${whole}${sym}` : sym;
    }
  }
  const rounded = n >= 100 ? Math.round(n) : n >= 10 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100;
  return String(rounded).replace('.', ',');
}

/** 45 → "45 min", 90 → "1 t 30 min", 2880 → "48 t". */
export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} t ${rest} min` : `${h} t`;
}

export function formatIngredient(ing: Ingredient, factor = 1): string {
  const parts: string[] = [];
  if (ing.amount !== undefined) {
    let amt = formatAmount(ing.amount * factor);
    if (ing.amount_max !== undefined) amt += `-${formatAmount(ing.amount_max * factor)}`;
    parts.push(amt);
  }
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  let s = parts.join(' ');
  if (ing.note) s += `, ${ing.note}`;
  if (ing.optional) s += ' (valgfri)';
  return s;
}

/** Textarea → ingredients. A line ending in ":" starts a group, e.g. "Dej:". */
export function parseIngredientText(text: string): Ingredient[] {
  const out: Ingredient[] = [];
  let group: string | undefined;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.endsWith(':')) {
      group = line.slice(0, -1).trim() || undefined;
      continue;
    }
    out.push(parseIngredientLine(line, group));
  }
  return out;
}

export function ingredientsToText(list: Ingredient[]): string {
  return toGroupedText(list, (i) => formatIngredient(i));
}

/** Textarea → steps. Blank lines separate steps; a line ending in ":" starts a group. */
export function parseStepText(text: string): Step[] {
  const out: Step[] = [];
  let group: string | undefined;
  for (const block of text.split(/\n\s*\n|\n(?=\s*\d+[.)]\s)/)) {
    const lines = block.trim().split('\n');
    if (lines.length && lines[0].trim().endsWith(':') && lines[0].trim().length < 60) {
      group = lines.shift()!.trim().slice(0, -1).trim() || undefined;
    }
    const body = lines.join(' ').replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim();
    if (body) out.push(group ? { group, text: body } : { text: body });
  }
  return out;
}

export function stepsToText(list: Step[]): string {
  return toGroupedText(list, (s) => s.text, '\n\n');
}

function toGroupedText<T extends { group?: string }>(list: T[], fmt: (x: T) => string, sep = '\n'): string {
  const lines: string[] = [];
  let group: string | undefined;
  for (const x of list) {
    if (x.group !== group) {
      group = x.group;
      if (group) lines.push(`${group}:`);
    }
    lines.push(fmt(x));
  }
  return lines.join(sep);
}
