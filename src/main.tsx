import { registerSW } from 'virtual:pwa-register';
import { render } from 'preact';
import { startStore } from './data/store';
import { App } from './ui/App';
import './ui/styles.css';

startStore();
render(<App />, document.getElementById('app')!);

// A new version is applied only on the list screen, so an update never interrupts an edit.
const updateSW = registerSW({
  onNeedRefresh() {
    const h = location.hash;
    if (h === '' || h === '#' || h === '#/') updateSW(true);
  },
});
