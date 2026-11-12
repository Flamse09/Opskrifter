import { useRef, useState } from 'preact/hooks';
import { addShoppingRows, removeShopping, setChecked, setSection, useStore } from '../../data/store';
import { parseIngredientLine } from '../../recipe/ingredients';
import { mergeItems, type MergedLine } from '../../shopping/merge';
import { groupBySection, SECTIONS, sectionOf } from '../../shopping/sections';
import { Icon } from '../icons';

export function ShoppingList() {
  const { shopping, sections } = useStore();
  const [text, setText] = useState('');
  const [moving, setMoving] = useState<MergedLine | null>(null);
  const lines = mergeItems(shopping);
  const toBuy = lines.filter((l) => !l.checked);
  const inCart = lines.filter((l) => l.checked);

  // Recipes on the list, so a whole recipe can be taken off again.
  const recipes = new Map<string, string[]>();
  for (const it of shopping) {
    if (!it.recipe_title) continue;
    const k = it.recipe_id ?? it.recipe_title;
    recipes.set(k, [...(recipes.get(k) ?? []), it.id]);
  }
  const titleOf = (k: string) => shopping.find((x) => (x.recipe_id ?? x.recipe_title) === k)?.recipe_title;

  function confirmRemove(title: string, ids: string[]) {
    if (confirm(`Fjern ${title} fra listen? ${ids.length} varer bliver slettet.`)) void removeShopping(ids);
  }

  async function add(e: Event) {
    e.preventDefault();
    const lineTexts = text.split('\n').map((t) => t.trim()).filter(Boolean);
    if (lineTexts.length === 0) return;
    setText('');
    await addShoppingRows(
      lineTexts.map((t) => {
        const ing = parseIngredientLine(t);
        return { name: ing.name || t, amount: ing.amount_max ?? ing.amount ?? null, unit: ing.unit ?? null, note: ing.note ?? null };
      }),
    );
  }

  return (
    <div>
      <div class="page-head">
        <h2>Indkøb</h2>
        <p class="muted small">
          {toBuy.length === 0 ? 'Intet at købe' : `${toBuy.length} ${toBuy.length === 1 ? 'vare' : 'varer'}`}
          {recipes.size > 0 && ` · fra ${recipes.size} ${recipes.size === 1 ? 'opskrift' : 'opskrifter'}`}
        </p>
      </div>

      <form class="add-box" onSubmit={add}>
        <div class="add-line">
          <Icon name="plus" size={20} />
          <input placeholder="Tilføj vare, fx 2 l mælk" value={text} onInput={(e) => setText(e.currentTarget.value)} enterKeyHint="done" />
          {text.trim() && (
            <button class="primary small-btn" type="submit">
              Tilføj
            </button>
          )}
        </div>
      </form>

      {recipes.size > 0 && (
        <div class="chips-wrap">
          {[...recipes].map(([k, ids]) => (
            <button key={k} class="pill" aria-label={`Fjern ${titleOf(k)} fra listen`} onClick={() => confirmRemove(titleOf(k) ?? 'opskriften', ids)}>
              {titleOf(k)}
              <Icon name="x" size={14} />
            </button>
          ))}
        </div>
      )}

      {lines.length === 0 && (
        <div class="empty">
          <p class="muted">Skriv en vare ovenfor, eller læg en opskrift på listen fra Opskrifter.</p>
        </div>
      )}

      {groupBySection(toBuy, sections).map(([section, items]) => (
        <section key={section}>
          <h4 class="aisle">{section}</h4>
          <ul class="rows">
            {items.map((l) => (
              <Line key={l.key} line={l} onMove={() => setMoving(l)} />
            ))}
          </ul>
        </section>
      ))}

      {toBuy.length > 0 && <p class="hint center list-hint">Stryg til venstre for at fjerne en vare. Hold fingeren på den for at flytte den til en anden afdeling.</p>}

      {inCart.length > 0 && (
        <section>
          <div class="section-head">
            <h4>I kurven · {inCart.length}</h4>
            <button class="link" onClick={() => removeShopping(inCart.flatMap((l) => l.ids))}>
              Ryd
            </button>
          </div>
          <ul class="rows done">
            {inCart.map((l) => (
              <Line key={l.key} line={l} onMove={() => setMoving(l)} />
            ))}
          </ul>
        </section>
      )}

      {moving && (
        <div class="sheet-backdrop" onClick={() => setMoving(null)}>
          <div class="sheet" role="dialog" aria-label={moving.name} onClick={(e) => e.stopPropagation()}>
            <h3>{moving.name}</h3>
            <p class="muted small">Flyt til en anden afdeling. Mise husker det til næste gang.</p>
            <div class="sheet-options">
              {SECTIONS.map((sec) => {
                const current = sectionOf(moving.name, sections) === sec;
                return (
                  <button
                    key={sec}
                    class={current ? 'on' : undefined}
                    onClick={() => {
                      void setSection(moving.name, sec);
                      setMoving(null);
                    }}
                  >
                    {sec}
                    {current && <Icon name="check" size={18} />}
                  </button>
                );
              })}
            </div>
            <button
              class="sheet-remove"
              onClick={() => {
                void removeShopping(moving.ids);
                setMoving(null);
              }}
            >
              <Icon name="x" size={18} /> Fjern fra listen
            </button>
            <button class="sheet-cancel" onClick={() => setMoving(null)}>
              Annuller
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SWIPE_REMOVE = 90; // px to the left before letting go removes the item

/**
 * Tap ticks the item off. Swipe left removes it (a ticked item stays in the history, an unticked one is forgotten).
 * Holding it, or right-clicking, opens the section picker.
 */
function Line({ line, onMove }: { line: MergedLine; onMove: () => void }) {
  const sub = [line.exact && `præcis ${line.exact}`, ...line.notes, ...line.sources].filter(Boolean).join(' · ');
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<[number, number] | null>(null);
  const swiping = useRef(false);
  const suppressClick = useRef(false);
  const [dx, setDxState] = useState(0);
  const dxRef = useRef(0);
  const setDx = (v: number) => {
    dxRef.current = v;
    setDxState(v);
  };
  const [settling, setSettling] = useState(false);

  const down = (e: PointerEvent) => {
    suppressClick.current = false;
    swiping.current = false;
    setSettling(false);
    start.current = [e.clientX, e.clientY];
    timer.current = window.setTimeout(() => {
      suppressClick.current = true;
      start.current = null;
      navigator.vibrate?.(10);
      onMove();
    }, 450);
  };
  const move = (e: PointerEvent) => {
    if (!start.current) return;
    const x = e.clientX - start.current[0];
    const y = e.clientY - start.current[1];
    if (!swiping.current) {
      if (Math.hypot(x, y) > 10) clearTimeout(timer.current);
      if (x < -10 && Math.abs(x) > Math.abs(y)) {
        swiping.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (Math.hypot(x, y) > 10) {
        start.current = null; // a scroll or a right swipe: leave it alone
        return;
      }
    }
    if (swiping.current) setDx(Math.min(0, x));
  };
  const up = () => {
    clearTimeout(timer.current);
    start.current = null;
    if (!swiping.current) return;
    swiping.current = false;
    suppressClick.current = true;
    setSettling(true);
    if (dxRef.current <= -SWIPE_REMOVE) {
      setDx(-window.innerWidth);
      window.setTimeout(() => void removeShopping(line.ids), 180);
    } else setDx(0);
  };

  return (
    <li class="swipe">
      <span class="swipe-bg" aria-hidden="true" style={{ opacity: Math.min(1, -dx / SWIPE_REMOVE) }}>
        <Icon name="x" size={18} /> Fjern
      </span>
      <button
        class={`row-btn ${settling ? 'settling' : ''}`}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        aria-pressed={line.checked}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!suppressClick.current) onMove();
          suppressClick.current = true;
        }}
        onClick={() => {
          if (suppressClick.current) return void (suppressClick.current = false);
          void setChecked(line.ids, !line.checked);
        }}
      >
        <span class="check" aria-hidden="true">
          {line.checked && <Icon name="check" size={14} />}
        </span>
        <span class="what">
          <span class="name">{line.name}</span>
          {sub && <span class="sub">{sub}</span>}
        </span>
        {line.qty && <span class="qty">{line.qty}</span>}
      </button>
    </li>
  );
}
