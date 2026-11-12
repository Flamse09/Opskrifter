export interface FreezerItem {
  id: string;
  household_id: string;
  created_at: string;
  frozen_on: string; // YYYY-MM-DD
  name: string;
  amount: number | null;
  unit: string | null;
  note: string | null;
}

const DAY = 86_400_000;

/** Whole days between a YYYY-MM-DD date and today (local time). */
export function daysSince(frozenOn: string, now = new Date()): number {
  const [y, m, d] = frozenOn.split('-').map(Number);
  const then = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - then) / DAY));
}

/** 0 → "i dag", 1 → "1 dag", 10 → "10 dage", 30 → "4 uger", 100 → "3 mdr", 800 → "2 år". */
export function formatAge(days: number): string {
  if (days === 0) return 'i dag';
  if (days < 14) return days === 1 ? '1 dag' : `${days} dage`;
  if (days < 63) return `${Math.floor(days / 7)} uger`;
  if (days < 730) return `${Math.floor(days / 30.44)} mdr`;
  return `${Math.floor(days / 365.25)} år`;
}

/** How urgently it should be eaten: under a month is fresh, three months or more is old. */
export function ageLevel(days: number): 'fresh' | 'ok' | 'old' {
  if (days < 30) return 'fresh';
  if (days < 90) return 'ok';
  return 'old';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
/** "2026-09-14" → "14. sep", with the year added when it is not this year. */
export function formatDate(frozenOn: string, now = new Date()): string {
  const [y, m, d] = frozenOn.split('-').map(Number);
  return `${d}. ${MONTHS[m - 1]}${y !== now.getFullYear() ? ` ${y}` : ''}`;
}

const MEASURED = new Set(['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l']);
/** True when "take one out" makes sense: a count above one, not a weight or volume. */
export function canTakeOne(item: Pick<FreezerItem, 'amount' | 'unit'>): boolean {
  return item.amount != null && item.amount > 1 && !MEASURED.has((item.unit ?? '').toLowerCase());
}

export function sortOldestFirst(items: FreezerItem[]): FreezerItem[] {
  return [...items].sort((a, b) => a.frozen_on.localeCompare(b.frozen_on) || a.name.localeCompare(b.name, 'da'));
}

/** Today as YYYY-MM-DD in local time. */
export function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
