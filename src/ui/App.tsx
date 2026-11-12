import { useState } from 'preact/hooks';
import { runUpdate, useStore } from '../data/store';
import { mergeItems } from '../shopping/merge';
import { Icon, Logo } from './icons';
import { LoginForm } from './LoginForm';
import { href, useRoute, type Route } from './router';
import { Freezer } from './screens/Freezer';
import { Home } from './screens/Home';
import { RecipeEdit } from './screens/RecipeEdit';
import { RecipeView } from './screens/RecipeView';
import { Settings } from './screens/Settings';
import { ShoppingList } from './screens/ShoppingList';

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <ShoppingList />;
    case 'freezer':
      return <Freezer />;
    case 'recipes':
      return <Home />;
    case 'recipe':
      return <RecipeView id={route.id} />;
    case 'edit':
      return <RecipeEdit id={route.id} />;
    case 'settings':
      return <Settings />;
  }
}

/** Which tab a screen belongs to, so the tab stays lit on a recipe page. */
function tabOf(route: Route): Route['name'] {
  if (route.name === 'recipe' || route.name === 'edit') return 'recipes';
  return route.name;
}

export function App() {
  const route = useRoute();
  const { user, authReady, error, shopping, loading } = useStore();
  const [spinning, setSpinning] = useState(false);
  const toBuy = mergeItems(shopping).filter((l) => !l.checked).length;
  const tab = tabOf(route);

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
        <a href={href({ name: 'home' })} class="brand" aria-label="Mise">
          <Logo size={22} />
          <span>Mise</span>
        </a>
        {user && (
          <nav class="row actions">
            <button class={`icon-btn ${spinning || loading ? 'spin' : ''}`} aria-label="Opdater" onClick={onRefresh}>
              <Icon name="refresh" size={21} />
            </button>
            <a href={href({ name: 'settings' })} class={`icon-btn ${tab === 'settings' ? 'on' : ''}`} aria-label="Indstillinger">
              <Icon name="sliders" size={21} />
            </a>
          </nav>
        )}
      </header>
      <main class={user ? 'with-tabs' : undefined}>
        {error && <p class="warn">Noget gik galt: {error}</p>}
        {!authReady ? null : user ? <Screen route={route} /> : <LoginForm />}
      </main>
      {user && (
        <nav class="tabbar" aria-label="Sider">
          <a href={href({ name: 'home' })} class={tab === 'home' ? 'on' : undefined}>
            <span class="tab-icon">
              <Icon name="list" />
              {toBuy > 0 && <span class="badge">{toBuy}</span>}
            </span>
            Liste
          </a>
          <a href={href({ name: 'freezer' })} class={tab === 'freezer' ? 'on' : undefined}>
            <Icon name="snow" />
            Fryser
          </a>
          <a href={href({ name: 'recipes' })} class={tab === 'recipes' ? 'on' : undefined}>
            <Icon name="book" />
            Opskrifter
          </a>
        </nav>
      )}
    </>
  );
}
