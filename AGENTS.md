# Opskrifter

Frederiks og hans kærestes private opskriftsapp: en Preact/Vite-PWA på GitHub Pages med Supabase som fælles database. Den bruger samme Supabase-projekt som Spilscore.

- **Lægge en opskrift ind:** følg [docs/IMPORT.md](docs/IMPORT.md). Brug `node scripts/add-recipe.ts`. Skriv aldrig direkte i databasen på anden vis.
- **Login til scriptet:** står i `.env.local` (`OPSKRIFTER_EMAIL`, `OPSKRIFTER_PASSWORD`), som Frederik selv udfylder. Vis eller udskriv aldrig værdierne.
- **Databaseskema:** `supabase/migrations/`. Frederik kører nye migrationer i Supabase → SQL Editor.
- **Kommandoer:** `npm run dev`, `npm test`, `npm run build`. Kør `npm test` og `npm run build` før commit.
- **Mængder:** skalering og sammenlægning er almindelig programkode i `src/recipe/`. AI bruges kun til at strukturere importen.
- **Projektnote:** `C:\Users\frede\Documents\Second Brain\Projects\Opskriftsapp.md`. Projektet er privat og må ikke logges i Daily-loggen.
