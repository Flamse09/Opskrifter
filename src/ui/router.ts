import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'home' }
  | { name: 'recipe'; id: string }
  | { name: 'edit'; id?: string }
  | { name: 'settings' };

export function parseRoute(hash: string): Route {
  const [, first, second] = hash.replace(/^#/, '').split('/');
  if (first === 'r' && second) return { name: 'recipe', id: second };
  if (first === 'edit') return second ? { name: 'edit', id: second } : { name: 'edit' };
  if (first === 'settings') return { name: 'settings' };
  return { name: 'home' };
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/';
    case 'recipe':
      return `#/r/${r.id}`;
    case 'edit':
      return r.id ? `#/edit/${r.id}` : '#/edit';
    case 'settings':
      return '#/settings';
  }
}

export function navigate(r: Route, replace = false): void {
  if (replace) location.replace(href(r));
  else location.hash = href(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
