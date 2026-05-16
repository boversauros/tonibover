import { supabase } from '../supabase';

const CA_LANGUAGE_ID = 1;
const EN_LANGUAGE_ID = 2;

interface RawTranslation {
  name: string;
  language_id: number;
}

interface RawCategoryRow {
  id: number;
  slug: string;
  category_translations: RawTranslation | RawTranslation[] | null;
}

interface CategoryEntry {
  id: string;
  slug: string;
  name: { ca: string; en: string };
}

export function categoriesLoader() {
  return async (): Promise<CategoryEntry[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, category_translations(name, language_id)');

    if (error) throw error;
    if (!data?.length) return [];

    const rows = data as unknown as RawCategoryRow[];
    const entries: CategoryEntry[] = [];

    for (const row of rows) {
      if (!row.slug) continue;
      const translations = Array.isArray(row.category_translations)
        ? row.category_translations
        : row.category_translations
          ? [row.category_translations]
          : [];

      const ca = translations.find((t) => t.language_id === CA_LANGUAGE_ID)?.name;
      const en = translations.find((t) => t.language_id === EN_LANGUAGE_ID)?.name;

      if (!ca || !en) {
        throw new Error(
          `Category "${row.slug}" is missing translations (ca=${!!ca}, en=${!!en}). ` +
            `Admin must provide both Catalan and English category names.`
        );
      }

      entries.push({ id: row.slug, slug: row.slug, name: { ca, en } });
    }

    return entries;
  };
}
