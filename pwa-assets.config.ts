import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Dark tile behind the mark, also for the padded maskable and Apple icons.
const background = '#121212';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
});
