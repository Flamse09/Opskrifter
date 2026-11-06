import { useState } from 'preact/hooks';
import { runUpdate, useStore } from '../data/store';
import { mergeItems } from '../shopping/merge';
import { LoginForm } from './LoginForm';
import { href, useRoute, type Route } from './router';
import { Home } from './screens/Home';
import { RecipeEdit } from './screens/RecipeEdit';
import { RecipeView } from './screens/RecipeView';
import { Settings } from './screens/Settings';
import { ShoppingList } from './screens/ShoppingList';

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'recipe':
      return <RecipeView id={route.id} />;
    case 'edit':
      return <RecipeEdit id={route.id} />;
    case 'settings':
      return <Settings />;
    case 'list':
      return <ShoppingList />;
  }
}

export function App() {
  const route = useRoute();
  const { user, authReady, error, shopping, loading } = useStore();
  const [spinning, setSpinning] = useState(false);
  const toBuy = mergeItems(shopping).filter((l) => !l.checked).length;

  async function onRefresh() {
    setSpinning(true);
    try {
      await runUpdate();
    } finally {
      setSpinning(false);
    }
  }
  return (
    <>
      <header class="top">
        <a href={href({ name: 'home' })} class="brand">
          <h1>Opskrifter</h1>
        </a>
        {user && (
          <nav class="row actions">
            <button class={`icon-btn ${spinning || loading ? 'spin' : ''}`} aria-label="Opdater" onClick={onRefresh}>
              ↻
            </button>
            <a href={href({ name: 'list' })} class="icon-btn cart" aria-label="Indkøbsliste">
              🛒{toBuy > 0 && <span class="badge">{toBuy}</span>}
            </a>
            <a href={href({ name: 'settings' })} class="icon-btn" aria-label="Indstillinger">
              ⚙︎
            </a>
          </nav>
        )}
      </header>
      <main>
        {error && <p class="warn">Kunne ikke hente opskrifter: {error}</p>}
        {!authReady ? null : user ? <Screen route={route} /> : <LoginForm />}
      </main>
    </>
  );
}
