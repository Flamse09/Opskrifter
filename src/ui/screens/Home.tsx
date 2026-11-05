import { useState } from 'preact/hooks';
import { useStore } from '../../data/store';
import { formatMinutes } from '../../recipe/ingredients';
import { searchRecipes } from '../../recipe/search';
import { href } from '../router';

export function Home() {
  const { recipes, loading } = useStore();
  const [query, setQuery] = useState(() => sessionStorage.getItem('q') ?? '');
  const [category, setCategory] = useState<string | undefined>(() => sessionStorage.getItem('cat') ?? undefined);
  const [favs, setFavs] = useState(false);

  const categories = [...new Set(recipes.map((r) => r.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'da'));
  const list = searchRecipes(recipes, { query, category, favoritesOnly: favs });

  function updateQuery(q: string) {
    setQuery(q);
    sessionStorage.setItem('q', q);
  }
  function toggleCategory(c: string) {
    const next = category === c ? undefined : c;
    setCategory(next);
    if (next) sessionStorage.setItem('cat', next);
    else sessionStorage.removeItem('cat');
  }

  return (
    <div>
      <input type="search" placeholder="Søg på ret eller ingrediens" value={query} onInput={(e) => updateQuery(e.currentTarget.value)} />
      <div class="chips scroll-row">
        <button class={`chip ${favs ? 'on' : ''}`} onClick={() => setFavs(!favs)}>
          ★ Favoritter
        </button>
        {categories.map((c) => (
          <button key={c} class={`chip ${category === c ? 'on' : ''}`} onClick={() => toggleCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 && !loading && (
        <div class="empty">
          {recipes.length === 0 ? (
            <>
              <p><strong>Ingen opskrifter endnu.</strong></p>
              <p class="muted">Send et billede, et link eller en tekst til Claude eller Codex, og bed om at få opskriften lagt ind. Eller skriv den selv.</p>
            </>
          ) : (
            <p class="muted">Ingen opskrifter matcher.</p>
          )}
        </div>
      )}

      <ul class="recipe-list">
        {list.map((r) => (
          <li key={r.id}>
            <a href={href({ name: 'recipe', id: r.id })} class="recipe-row">
              {r.image_url ? <img src={r.image_url} alt="" loading="lazy" /> : <div class="thumb-fallback">{r.title.slice(0, 1)}</div>}
              <div>
                <div class="title">
                  {r.title} {r.favorite && <span class="star">★</span>}
                </div>
                <div class="muted small">
                  {[r.category, r.total_minutes && formatMinutes(r.total_minutes)].filter(Boolean).join(' · ')}
                  {r.flags.length > 0 && <span class="flag-dot" title="Har uklarheder"> · ⚠︎</span>}
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <a href={href({ name: 'edit' })} class="fab" aria-label="Ny opskrift">
        +
      </a>
    </div>
  );
}
