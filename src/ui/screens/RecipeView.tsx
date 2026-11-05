import { useState } from 'preact/hooks';
import { setFavorite, useStore } from '../../data/store';
import { formatAmount, formatIngredient, formatMinutes } from '../../recipe/ingredients';
import type { Ingredient, Step } from '../../recipe/types';
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

  if (!r) return <p class="muted">{loading ? 'Henter…' : 'Opskriften findes ikke.'}</p>;

  const base = r.servings ?? null;
  const current = servings ?? base;
  const factor = base && current ? current / base : 1;
  const step = base && base % 1 === 0 ? 1 : 0.5;
  const time = [
    r.prep_minutes && `Forberedelse ${formatMinutes(r.prep_minutes)}`,
    r.cook_minutes && `Tilberedning ${formatMinutes(r.cook_minutes)}`,
    r.total_minutes && `I alt ${formatMinutes(r.total_minutes)}`,
  ].filter(Boolean);

  return (
    <article class="recipe">
      {r.image_url && <img class="hero" src={r.image_url} alt="" />}
      <div class="row between">
        <h2 class="recipe-title">{r.title}</h2>
        <button class="icon-btn" aria-label={r.favorite ? 'Fjern favorit' : 'Gør til favorit'} onClick={() => setFavorite(r.id, !r.favorite)}>
          {r.favorite ? '★' : '☆'}
        </button>
      </div>
      <div class="muted small">
        {[r.category, ...r.tags.map((t) => `#${t}`)].filter(Boolean).join(' · ')}
      </div>
      {r.description && <p>{r.description}</p>}
      {time.length > 0 && <p class="muted small">{time.join(' · ')}</p>}

      {r.flags.length > 0 && (
        <div class="warn">
          <strong>Tjek opskriften</strong>
          <ul>
            {r.flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <section>
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
        <IngredientList list={r.ingredients} factor={factor} />
      </section>

      {r.equipment.length > 0 && (
        <section>
          <h3>Udstyr</h3>
          <p class="muted">{r.equipment.join(', ')}</p>
        </section>
      )}

      <section>
        <h3>Fremgangsmåde</h3>
        <StepList list={r.steps} />
      </section>

      {r.notes && (
        <section>
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

function IngredientList({ list, factor }: { list: Ingredient[]; factor: number }) {
  return (
    <>
      {groupBy(list).map(([group, items], i) => (
        <div key={i}>
          {group && <h4>{group}</h4>}
          <ul class="ingredients">
            {items.map((ing, j) => (
              <li key={j}>{formatIngredient(ing, factor)}</li>
            ))}
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
              return <li key={j}>{s.text}</li>;
            })}
          </ol>
        </div>
      ))}
    </>
  );
}
