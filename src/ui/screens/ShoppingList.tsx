import { useState } from 'preact/hooks';
import { addShoppingRows, removeShopping, setChecked, useStore } from '../../data/store';
import { parseIngredientLine } from '../../recipe/ingredients';
import { mergeItems, type MergedLine } from '../../shopping/merge';
import { Icon } from '../icons';

export function ShoppingList() {
  const { shopping } = useStore();
  const [text, setText] = useState('');
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

      <ul class="rows">
        {toBuy.map((l) => (
          <Line key={l.key} line={l} />
        ))}
      </ul>

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
              <Line key={l.key} line={l} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Line({ line }: { line: MergedLine }) {
  const sub = [line.exact && `præcis ${line.exact}`, ...line.notes, ...line.sources].filter(Boolean).join(' · ');
  return (
    <li>
      <button class="row-btn" aria-pressed={line.checked} onClick={() => setChecked(line.ids, !line.checked)}>
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
