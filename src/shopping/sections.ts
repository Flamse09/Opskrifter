/**
 * Store sections in the order you walk a typical Danish supermarket.
 * An item belongs to the section of the longest keyword that starts one of its words,
 * so "kartoffelmel" lands in Bagning while "kartofler" lands in Frugt og grønt.
 */
export const SECTIONS = [
  'Frugt og grønt',
  'Brød',
  'Kød og fisk',
  'Pålæg',
  'Mejeri og æg',
  'Kolonial',
  'Bagning',
  'Frost',
  'Drikkevarer',
  'Husholdning',
  'Andet',
] as const;
export type Section = (typeof SECTIONS)[number];

const KEYWORDS: Record<Exclude<Section, 'Andet'>, string[]> = {
  'Frugt og grønt': [
    'æble', 'pære', 'banan', 'citron', 'lime', 'appelsin', 'mandarin', 'clementin', 'vindrue', 'drue', 'jordbær', 'hindbær',
    'blåbær', 'brombær', 'melon', 'vandmelon', 'ananas', 'mango', 'avocado', 'kiwi', 'granatæble', 'tomat', 'cherrytomat',
    'agurk', 'salat', 'icebergsalat', 'spinat', 'rucola', 'kål', 'hvidkål', 'rødkål', 'grønkål', 'spidskål', 'broccoli',
    'blomkål', 'gulerod', 'gulerødder', 'kartof', 'løg', 'rødløg', 'hvidløg', 'forårsløg', 'skalotteløg', 'porre', 'ingefær',
    'chili', 'peberfrugt', 'squash', 'aubergine', 'champignon', 'svamp', 'portobello', 'kantarel', 'selleri', 'fennikel',
    'rødbede', 'pastinak', 'persille', 'koriander', 'basilikum', 'timian', 'rosmarin', 'mynte', 'dild', 'purløg', 'salvie',
    'citrongræs', 'asparges', 'radise', 'majs', 'sukkerærter', 'bønnespirer', 'frugt', 'grønt',
  ],
  Brød: ['brød', 'rugbrød', 'franskbrød', 'bolle', 'boller', 'baguette', 'toast', 'pitabrød', 'tortilla', 'wraps', 'naan', 'knækbrød', 'burgerboller'],
  'Kød og fisk': [
    'kylling', 'oksekød', 'hakket', 'svinekød', 'flæsk', 'bacon', 'pølse', 'pølser', 'lam', 'lammekød', 'andebryst', 'andelår', 'andesteg', 'kalkun',
    'laks', 'torsk', 'rejer', 'fisk', 'mørbrad', 'culotte', 'entrecote', 'medister', 'frikadelle', 'kød', 'oksefilet', 'skinke',
  ],
  Pålæg: ['pålæg', 'salami', 'leverpostej', 'spegepølse', 'parmaskinke', 'serrano', 'chorizo', 'hamburgerryg', 'rullepølse'],
  'Mejeri og æg': [
    'mælk', 'sødmælk', 'letmælk', 'minimælk', 'skummetmælk', 'kærnemælk', 'fløde', 'piskefløde', 'madlavningsfløde',
    'creme fraiche', 'crème fraîche', 'yoghurt', 'skyr', 'kvark', 'ymer', 'smør', 'margarine', 'ost', 'flødeost', 'hytteost',
    'mozzarella', 'burrata', 'parmesan', 'pecorino', 'cheddar', 'feta', 'halloumi', 'mascarpone', 'ricotta', 'æg', 'havremælk',
  ],
  Kolonial: [
    'pasta', 'spaghetti', 'penne', 'fusilli', 'lasagneplader', 'nudler', 'ris', 'couscous', 'bulgur', 'quinoa', 'dåse',
    'hakkede tomater', 'flåede tomater', 'tomatpuré', 'passata', 'kokosmælk', 'bønner', 'kikærter', 'linser', 'olie',
    'olivenolie', 'rapsolie', 'eddike', 'balsamico', 'soja', 'fiskesauce', 'ketchup', 'sennep', 'mayonnaise', 'bouillon',
    'fond', 'salt', 'havsalt', 'flagesalt', 'peber', 'krydderi', 'kanel', 'spidskommen', 'paprika', 'karry', 'oregano',
    'laurbær', 'muskat', 'chiliflager', 'honning', 'sirup', 'havregryn', 'müsli', 'cornflakes', 'nødder', 'mandler',
    'pinjekerner', 'rosiner', 'kaffe', 'te', 'marmelade', 'oliven', 'kapers', 'pesto', 'tun',
  ],
  Bagning: [
    'mel', 'hvedemel', 'rugmel', 'speltmel', 'durum', 'kartoffelmel', 'majsstivelse', 'sukker', 'farin', 'flormelis',
    'muscovado', 'rørsukker', 'gær', 'tørgær', 'bagepulver', 'natron', 'vanilje', 'kakao', 'chokolade', 'marcipan', 'karamel',
  ],
  Frost: ['frost', 'frossen', 'frosne', 'ærter', 'vaniljeis', 'isvafler', 'pommes frites'],
  Drikkevarer: ['danskvand', 'sodavand', 'kildevand', 'juice', 'saft', 'øl', 'vin', 'rødvin', 'hvidvin', 'cola'],
  Husholdning: [
    'toiletpapir', 'køkkenrulle', 'opvask', 'vaskemiddel', 'sæbe', 'shampoo', 'tandpasta', 'affaldsposer', 'skraldeposer',
    'alufolie', 'bagepapir', 'film', 'fryseposer', 'servietter', 'batterier', 'skuresvamp', 'karklud',
  ],
};

const fold = (s: string) => s.toLowerCase().trim();
const RULES: [string, Section][] = Object.entries(KEYWORDS)
  .flatMap(([section, words]) => words.map((w) => [fold(w), section as Section] as [string, Section]))
  .sort((a, b) => b[0].length - a[0].length);

/** True when the keyword starts the text or one of its words. */
function startsAWord(text: string, keyword: string): boolean {
  let i = text.indexOf(keyword);
  while (i !== -1) {
    if (i === 0 || !/[a-zæøåéü]/.test(text[i - 1])) return true;
    i = text.indexOf(keyword, i + 1);
  }
  return false;
}

export function sectionOf(name: string): Section {
  const text = fold(name);
  for (const [keyword, section] of RULES) if (startsAWord(text, keyword)) return section;
  return 'Andet';
}

/** Groups items by section in walking order; empty sections are left out. */
export function groupBySection<T extends { name: string }>(items: T[]): [Section, T[]][] {
  const groups = new Map<Section, T[]>();
  for (const it of items) {
    const s = sectionOf(it.name);
    groups.set(s, [...(groups.get(s) ?? []), it]);
  }
  return SECTIONS.filter((s) => groups.has(s)).map((s) => [s, groups.get(s)!]);
}
