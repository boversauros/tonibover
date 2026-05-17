import { supabase } from '../supabase';
import type { Tables } from '../database.types';
import { CA_LANGUAGE_ID, EN_LANGUAGE_ID } from './types';

type CategoryTranslation = Pick<Tables<'category_translations'>, 'name' | 'language_id'>;
type CategoryRow = Pick<Tables<'categories'>, 'id' | 'slug'> & {
  category_translations: CategoryTranslation | CategoryTranslation[] | null;
};

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

    const rows = data as unknown as CategoryRow[];
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
