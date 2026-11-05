export interface Ingredient {
  group?: string; // e.g. "Dej", "Sauce"
  name: string;
  amount?: number;
  amount_max?: number; // for ranges like "1-2 fed"
  unit?: string;
  note?: string; // e.g. "finthakket"
  optional?: boolean;
}

export interface Step {
  group?: string;
  text: string;
}

export const SOURCE_TYPES = ['web', 'video', 'image', 'text', 'manual'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** The editable part of a recipe, shared by the app, the import script and the database. */
export interface RecipeInput {
  title: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  servings?: number | null;
  yield_text?: string | null;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  total_minutes?: number | null;
  ingredients: Ingredient[];
  steps: Step[];
  equipment: string[];
  notes?: string | null;
  flags: string[];
  source_type: SourceType;
  source_url?: string | null;
  source_text?: string | null;
  image_url?: string | null;
  favorite?: boolean;
}

export interface Recipe extends RecipeInput {
  id: string;
  household_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  favorite: boolean;
}

export const CATEGORIES = [
  'Aftensmad',
  'Frokost',
  'Morgenmad',
  'Forret',
  'Tilbehør',
  'Suppe',
  'Salat',
  'Pizzadej',
  'Pizzasauce',
  'Pizzatopping',
  'Brød',
  'Kage',
  'Dessert',
  'Drikke',
  'Sauce og dressing',
  'Andet',
] as const;
