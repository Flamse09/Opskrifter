import { useState } from 'preact/hooks';
import { addShoppingRows, setFavorite, useStore } from '../../data/store';
import { rowsFromRecipe } from '../../shopping/merge';
import { formatAmount, formatMinutes, formatQuantity } from '../../recipe/ingredients';
import type { Ingredient, Step } from '../../recipe/types';
import { Icon } from '../icons';
import { href } from '../router';

function groupBy<T extends { group?: string }>(list: T[]): [string | undefined, T[]][] {
  const out: [string | undefined, T[]][] = [];
  for (const x of list) {
    const last = out[out.length - 1];
    if (last && last[0] === x.group) last[1].push(x);
    else out.push([x.group, [x]]);
  }
  return out;
}

const SOURCE_LABEL: Record<string, string> = { web: 'Hjemmeside', video: 'Video', image: 'Billede', text: 'Tekst', manual: 'Egen opskrift' };

export function RecipeView({ id }: { id: string }) {
  const { recipes, loading } = useStore();
  const r = recipes.find((x) => x.id === id);
  const [servings, setServings] = useState<number | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [omitted, setOmitted] = useState<Set<number>>(() => new Set());
  const [added, setAdded] = useState<string | null>(null);

  if (!r) return <p class="muted">{loading ? 'Henter…' : 'Opskriften findes ikke.'}</p>;

  const base = r.servings ?? null;
  const current = servings ?? base;
  const factor = base && current ? current / base : 1;
  const step = base && base % 1 === 0 ? 1 : 0.5;
  const time = (
    [
      ['Aktiv tid', r.prep_minutes],
      ['Tilberedning', r.cook_minutes],
      ['I alt', r.total_minutes],
    ] as const
  ).filter(([, m]) => m);

  async function addToList() {
    if (!r) return;
    try {
      const n = await addShoppingRows(rowsFromRecipe(r.ingredients, factor, omitted), { id: r.id, title: r.title });
      setAdded(`${n} varer lagt på listen`);
    } catch (e) {
      setAdded((e as Error).message);
    }
  }

  function toggleOmit(i: number) {
    const next = new Set(omitted);
    if (!next.delete(i)) next.add(i);
    setOmitted(next);
  }

  return (
    <article class="recipe">
      {r.image_url && (
        <figure class="photo">
          <img src={r.image_url} alt="" />
        </figure>
      )}
      <header class="recipe-head">
        <button class="icon-btn fav" aria-label={r.favorite ? 'Fjern favorit' : 'Gør til favorit'} onClick={() => setFavorite(r.id, !r.favorite)}>
          <Icon name="star" filled={r.favorite} />
        </button>
        <h2 class="recipe-title">{r.title}</h2>
      </header>
      {(r.category || r.tags.length > 0) && (
        <div class="tags">
          {r.category && <span class="tag cat">{r.category}</span>}
          {r.tags.map((t) => (
            <span key={t} class="tag">
              {t}
            </span>
          ))}
        </div>
      )}
      {r.description && <p class="lead">{r.description}</p>}
      {time.length > 0 && (
        <div class="stats">
          {time.map(([label, m]) => (
            <div key={label}>
              <span class="stat-label">{label}</span>
              <span class="stat-value">{formatMinutes(m!)}</span>
            </div>
          ))}
        </div>
      )}

      {r.flags.length > 0 && (
        <details class="warn">
          <summary>
            Tjek opskriften <span class="count">{r.flags.length}</span>
          </summary>
          <ul>
            {r.flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      )}

      <section class="panel">
        <div class="row between">
          <h3>Ingredienser</h3>
          {base && (
            <div class="stepper">
              <button aria-label="Færre" disabled={(current ?? 0) <= step} onClick={() => setServings(Math.max(step, (current ?? base) - step))}>
                −
              </button>
              <span>
                {formatAmount(current ?? base)} port.
              </span>
              <button aria-label="Flere" onClick={() => setServings((current ?? base) + step)}>
                +
              </button>
            </div>
          )}
        </div>
        {(r.yield_text || factor !== 1) && (
          <p class="muted small">
            {r.yield_text && `Opskriften giver ${r.yield_text}`}
            {r.yield_text && factor !== 1 && ' · '}
            {factor !== 1 && `mængder ganget med ${formatAmount(factor)}`}
          </p>
        )}
        <IngredientList list={r.ingredients} factor={factor} omitted={omitted} onToggle={toggleOmit} />
        <button class="primary add-list" onClick={addToList}>
          <Icon name="list" size={20} /> Læg på indkøbslisten
        </button>
        {added && (
          <p class="muted small center">
            {added} · <a href={href({ name: 'home' })}>Se listen</a>
          </p>
        )}
      </section>

      {r.equipment.length > 0 && (
        <section>
          <h3>Udstyr</h3>
          <div class="tags">
            {r.equipment.map((e) => (
              <span key={e} class="tag">
                {e}
              </span>
            ))}
          </div>
        </section>
      )}

      {r.steps.length > 0 && (
        <section>
          <h3>Fremgangsmåde</h3>
          <StepList list={r.steps} />
        </section>
      )}

      {r.notes && (
        <section class="sticky-note">
          <h3>Noter</h3>
          <p class="pre">{r.notes}</p>
        </section>
      )}

      <section class="muted small">
        <p>
          Kilde: {SOURCE_LABEL[r.source_type] ?? r.source_type}
          {r.source_url && (
            <>
              {' · '}
              <a href={r.source_url} target="_blank" rel="noopener noreferrer">
                Åbn original
              </a>
            </>
          )}
          {r.source_text && (
            <>
              {' · '}
              <button class="link" onClick={() => setShowSource(!showSource)}>
                {showSource ? 'Skjul' : 'Vis'} importeret tekst
              </button>
            </>
          )}
        </p>
        {showSource && <pre class="source">{r.source_text}</pre>}
      </section>

      <a class="button" href={href({ name: 'edit', id: r.id })}>
        Rediger
      </a>
    </article>
  );
}

function IngredientList(props: { list: Ingredient[]; factor: number; omitted: Set<number>; onToggle: (i: number) => void }) {
  const { list, factor, omitted, onToggle } = props;
  let n = 0;
  return (
    <>
      {groupBy(list).map(([group, items], i) => (
        <div key={i}>
          {group && <h4>{group}</h4>}
          <ul class="ingredients">
            {items.map((ing) => {
              const idx = n++;
              const off = omitted.has(idx);
              return (
                <li key={idx} class={off ? 'omitted' : undefined}>
                  <span class="qty">{formatQuantity(ing, factor)}</span>
                  <span class="what">
                    <span class="name">{ing.name}</span>
                    {ing.note && <span class="note">{ing.note}</span>}
                  </span>
                  {ing.optional && (
                    <button class={`omit ${off ? 'on' : ''}`} aria-pressed={off} onClick={() => onToggle(idx)}>
                      {off ? 'Tilføj' : 'Undlad'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

function StepList({ list }: { list: Step[] }) {
  let n = 0;
  return (
    <>
      {groupBy(list).map(([group, items], i) => (
        <div key={i}>
          {group && <h4>{group}</h4>}
          <ol class="steps" start={n + 1}>
            {items.map((s, j) => {
              n++;
              return (
                <li key={j}>
                  <span class="num" aria-hidden="true">
                    {n}
                  </span>
                  <span>{s.text}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </>
  );
}
