import { useState } from 'preact/hooks';
import { useStore } from '../../data/store';
import { formatMinutes } from '../../recipe/ingredients';
import { groupByCategory, searchRecipes } from '../../recipe/search';
import type { Recipe } from '../../recipe/types';
import { href } from '../router';

export function Home() {
  const { recipes, loading } = useStore();
  const [query, setQuery] = useState(() => sessionStorage.getItem('q') ?? '');
  const [favs, setFavs] = useState(false);

  const list = searchRecipes(recipes, { query, favoritesOnly: favs });
  const searching = query.trim() !== '';

  function updateQuery(q: string) {
    setQuery(q);
    sessionStorage.setItem('q', q);
  }

  return (
    <div>
      <input type="search" placeholder="Søg på ret eller ingrediens" value={query} onInput={(e) => updateQuery(e.currentTarget.value)} />
      <div class="chips scroll-row">
        <button class={`chip ${favs ? 'on' : ''}`} onClick={() => setFavs(!favs)}>
          ★ Favoritter
        </button>
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

      {searching ? (
        list.length > 0 && (
          <section>
            <h4 class="group-title">{list.length === 1 ? '1 opskrift' : `${list.length} opskrifter`}</h4>
            <RecipeList list={list} showCategory />
          </section>
        )
      ) : (
        groupByCategory(list).map(([category, items]) => (
          <section key={category}>
            <h4 class="group-title">
              {category} <span class="muted">{items.length}</span>
            </h4>
            <RecipeList list={items} />
          </section>
        ))
      )}

      <a href={href({ name: 'edit' })} class="fab" aria-label="Ny opskrift">
        +
      </a>
    </div>
  );
}

function RecipeList({ list, showCategory = false }: { list: Recipe[]; showCategory?: boolean }) {
  return (
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
                {[showCategory && r.category, r.total_minutes && formatMinutes(r.total_minutes)].filter(Boolean).join(' · ')}
                {r.flags.length > 0 && <span class="flag-dot" title="Har uklarheder"> · ⚠︎</span>}
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
