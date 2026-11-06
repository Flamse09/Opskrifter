import { useState } from 'preact/hooks';
import { addShoppingRows, removeShopping, setChecked, useStore } from '../../data/store';
import { parseIngredientLine } from '../../recipe/ingredients';
import { mergeItems, type MergedLine } from '../../shopping/merge';

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
    <div class="notebook">
      <h2>Indkøbsliste</h2>
      <form class="add-row" onSubmit={add}>
        <input placeholder="Tilføj vare, fx 2 l mælk" value={text} onInput={(e) => setText(e.currentTarget.value)} enterKeyHint="done" />
        <button class="primary" type="submit" disabled={!text.trim()}>
          Tilføj
        </button>
      </form>

      {recipes.size > 0 && (
        <div class="tags list-recipes">
          {[...recipes].map(([k, ids]) => (
            <button key={k} class="tag removable" aria-label={`Fjern ${titleOf(k)} fra listen`} onClick={() => confirmRemove(titleOf(k) ?? 'opskriften', ids)}>
              {titleOf(k)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {lines.length === 0 && (
        <div class="empty">
          <p>
            <strong>Listen er tom.</strong>
          </p>
          <p class="muted">Skriv en vare ovenfor, eller tryk "Læg på indkøbslisten" på en opskrift.</p>
        </div>
      )}

      <ul class="shop">
        {toBuy.map((l) => (
          <Line key={l.key} line={l} />
        ))}
      </ul>

      {inCart.length > 0 && (
        <section>
          <div class="row between">
            <h4 class="group-title">I kurven {inCart.length}</h4>
            <button class="link" onClick={() => removeShopping(inCart.flatMap((l) => l.ids))}>
              Ryd
            </button>
          </div>
          <ul class="shop done">
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
      <button class="shop-line" aria-pressed={line.checked} onClick={() => setChecked(line.ids, !line.checked)}>
        <span class="check" aria-hidden="true">
          {line.checked ? '✓' : ''}
        </span>
        <span class="what">
          <span class="name">
            {line.qty && <span class="qty">{line.qty}</span>} {line.name}
          </span>
          {sub && <span class="note">{sub}</span>}
        </span>
      </button>
    </li>
  );
}
