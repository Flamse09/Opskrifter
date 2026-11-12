// Outline icons in the style of Tabler Icons (MIT), drawn on a 24px grid.
const PATHS = {
  list: ['M3.5 5.5l1.5 1.5l2.5 -2.5', 'M3.5 11.5l1.5 1.5l2.5 -2.5', 'M3.5 17.5l1.5 1.5l2.5 -2.5', 'M11 6h9', 'M11 12h9', 'M11 18h9'],
  snow: ['M12 3v18', 'M4.2 7.5l15.6 9', 'M19.8 7.5l-15.6 9', 'M10 4.5l2 1.5l2 -1.5', 'M10 19.5l2 -1.5l2 1.5', 'M4.6 10.4l1.9 -.9l-.2 -2.4', 'M19.4 13.6l-1.9 .9l.2 2.4', 'M19.4 10.4l-1.9 -.9l.2 -2.4', 'M4.6 13.6l1.9 .9l-.2 2.4'],
  book: ['M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0', 'M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0', 'M3 6v13', 'M12 6v13', 'M21 6v13'],
  sliders: ['M4 6h8', 'M16 6h4', 'M4 12h2', 'M10 12h10', 'M4 18h11', 'M19 18h1'],
  refresh: ['M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4', 'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'],
  plus: ['M12 5v14', 'M5 12h14'],
  check: ['M5 12l5 5l10 -10'],
  back: ['M5 12h14', 'M5 12l6 6', 'M5 12l6 -6'],
  x: ['M18 6l-12 12', 'M6 6l12 12'],
  minus: ['M5 12h14'],
  star: ['M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z'],
} as const;

const CIRCLES: Partial<Record<keyof typeof PATHS, [number, number, number][]>> = {
  sliders: [[14, 6, 2], [8, 12, 2], [17, 18, 2]],
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg class="icon" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {CIRCLES[name]?.map(([cx, cy, r]) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} />)}
    </svg>
  );
}

/** The Mise mark: four bowls, mise en place, one of them filled. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
      <rect x="6" y="6" width="11" height="11" rx="3" />
      <rect x="21" y="6" width="11" height="11" rx="3" fill="currentColor" />
      <rect x="6" y="21" width="11" height="11" rx="3" />
      <rect x="21" y="21" width="11" height="11" rx="3" />
    </svg>
  );
}
