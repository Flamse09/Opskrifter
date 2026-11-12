import { registerSW } from 'virtual:pwa-register';
import { render } from 'preact';
import { refresh, setUpdateHandler, startStore } from './data/store';
import { App } from './ui/App';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './ui/styles.css';

startStore();
render(<App />, document.getElementById('app')!);

// A new version is applied only on the list screens, so an update never interrupts an edit.
let updateReady = false;
let registration: ServiceWorkerRegistration | undefined;
const onSafeScreen = () => ['', '#', '#/', '#/list', '#/opskrifter', '#/fryser'].includes(location.hash);
const updateSW = registerSW({
  onNeedRefresh() {
    updateReady = true;
    if (onSafeScreen()) void updateSW(true);
  },
  onRegisteredSW(_url, r) {
    registration = r;
  },
});
window.addEventListener('hashchange', () => updateReady && onSafeScreen() && void updateSW(true));

// iOS keeps a home-screen app frozen in the background, so check for new data and a new version on every return.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  void registration?.update();
  void refresh();
});

// The ↻ button: install a waiting version, otherwise refetch data.
setUpdateHandler(async () => {
  if (updateReady) return updateSW(true);
  await registration?.update();
  await refresh();
});
