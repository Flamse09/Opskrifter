import { useStore } from '../data/store';
import { LoginForm } from './LoginForm';
import { href, useRoute, type Route } from './router';
import { Home } from './screens/Home';
import { RecipeEdit } from './screens/RecipeEdit';
import { RecipeView } from './screens/RecipeView';
import { Settings } from './screens/Settings';

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
  }
}

export function App() {
  const route = useRoute();
  const { user, authReady, error } = useStore();
  return (
    <>
      <header class="top">
        <a href={href({ name: 'home' })} class="brand">
          <h1>Opskrifter</h1>
        </a>
        {user && (
          <a href={href({ name: 'settings' })} class="icon-btn" aria-label="Indstillinger">
            ⚙︎
          </a>
        )}
      </header>
      <main>
        {error && <p class="warn">Kunne ikke hente opskrifter: {error}</p>}
        {!authReady ? null : user ? <Screen route={route} /> : <LoginForm />}
      </main>
    </>
  );
}
