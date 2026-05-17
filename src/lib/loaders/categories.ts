import type { Loader } from 'astro/loaders';
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

async function fetchCategoryEntries(): Promise<CategoryEntry[]> {
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
}

export function categoriesLoader(): Loader {
  return {
    name: 'tonibover-categories',
    async load({ store, logger, parseData, generateDigest }) {
      try {
        const entries = await fetchCategoryEntries();
        store.clear();
        for (const entry of entries) {
          const data = await parseData({
            id: entry.id,
            data: entry as unknown as Record<string, unknown>,
          });
          store.set({ id: entry.id, data, digest: generateDigest(data) });
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          logger.warn(
            `[categories] fetch failed, keeping cached entries: ${err instanceof Error ? err.message : String(err)}`
          );
          return;
        }
        throw err;
      }
    },
  };
}
