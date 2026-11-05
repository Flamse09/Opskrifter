# Sådan lægger en assistent en opskrift ind

Frederik sender et billede, et link, en video eller en tekst og beder om at få opskriften lagt ind. Gør sådan:

1. **Hent indholdet.**
   - Hjemmeside: læs siden. Brug opskriftens strukturerede data (schema.org `Recipe`), hvis den findes, men tjek mod den synlige tekst.
   - YouTube: brug beskrivelsen og, hvis den kan hentes, udskriften. Linker beskrivelsen til en opskrift, så brug den. Står mængderne kun i selve billedet, så bed om skærmbilleder i stedet for at gætte.
   - Billede: læs teksten på billedet. Er noget ulæseligt, skal det markeres i `flags`.
2. **Rens opskriften.** Fjern historier, reklamer og gentagelser. Bevar alt, der betyder noget for madlavningen: temperaturer, tider, hævetider, rækkefølge og tips.
3. **Opfind intet.** Mangler en mængde, så udelad `amount` og skriv det i `flags`, fx `"Mængden af salt er ikke angivet."`. Skriv også uklarheder og dine egne fortolkninger i `flags`.
4. **Hold udstyr ude af ingredienserne.** Ovn, skål, pizzasten, bagepapir, film og lignende hører under `equipment`. Scriptet afviser opskrifter, hvor udstyr står som ingrediens.
5. **Skriv på dansk.** Oversæt udenlandske opskrifter, og omregn cups/oz/°F til metriske enheder. Notér omregningen i `notes`.
6. **Gem en JSON-fil** i dit scratchpad (ikke i repoet), og kør først en tør test:
   ```
   node scripts/add-recipe.ts add <fil.json> --dry-run
   node scripts/add-recipe.ts add <fil.json>
   ```
   Findes opskriften allerede, så stopper scriptet. Brug `list` og `get <id>` til at finde den, og `update <id> <fil.json>` til at rette den.
7. **Fortæl Frederik**, hvad der blev gemt, og hvilke `flags` der skal tjekkes.

## Format

```json
{
  "title": "Koldhævet pizzadej",
  "description": "Neapolitansk-inspireret dej med 48 timers koldhævning.",
  "category": "Pizzadej",
  "tags": ["pizza", "koldhævet"],
  "servings": 4,
  "yield_text": "4 dejkugler á 250 g",
  "prep_minutes": 20,
  "cook_minutes": 5,
  "total_minutes": 2900,
  "ingredients": [
    { "name": "hvedemel", "amount": 600, "unit": "g", "note": "tipo 00" },
    { "name": "vand", "amount": 390, "unit": "g", "note": "koldt" },
    { "name": "salt", "amount": 18, "unit": "g" },
    { "name": "tørgær", "amount": 1, "unit": "g" },
    { "group": "Til servering", "name": "basilikum", "optional": true }
  ],
  "steps": [
    { "text": "Opløs gæren i vandet, og rør melet i." },
    { "text": "Tilsæt salt efter 20 minutter, og ælt til dejen er glat." },
    { "group": "Hævning", "text": "Hæv dejen i køleskabet i 48 timer." }
  ],
  "equipment": ["røremaskine", "pizzasten"],
  "notes": "Vandmængden er 65 % hydrering.",
  "flags": [],
  "source_type": "video",
  "source_url": "https://www.youtube.com/watch?v=...",
  "source_text": "Det oprindelige, urensede indhold (beskrivelse, transskription eller OCR-tekst)",
  "image_url": null
}
```

- **Påkrævet:** `title`, `ingredients`, `steps`. Sæt også `servings` eller `yield_text`, ellers kan opskriften ikke skaleres.
- `source_type`: `web`, `video`, `image`, `text` eller `manual`.
- `amount` er et tal (`0.5`, ikke `"½"`). Ved intervaller som "1-2 fed" bruges `amount` 1 og `amount_max` 2.
- `unit`: brug korte danske enheder: `g`, `kg`, `ml`, `dl`, `l`, `tsk`, `spsk`, `knsp`, `stk`, `fed`, `dåse`, `bundt`.
- `name` er selve varen i ental eller flertal, som man køber den ("løg", "hvidløg", "hakkede tomater"). Tilberedningen står i `note` ("finthakket").
- Kategorier: Aftensmad, Frokost, Morgenmad, Forret, Tilbehør, Suppe, Salat, Pizzadej, Pizzasauce, Pizzatopping, Brød, Kage, Dessert, Drikke, Sauce og dressing, Andet.
- Pizzadele gemmes hver for sig: én opskrift til dejen, én til saucen og én til hver toppingkombination. For toppings sættes `yield_text` til "topping til 1 pizza" og `servings` til 1.
- `image_url` må kun være et direkte billedlink fra kilden. Lad feltet være tomt, hvis der ikke er et.
