import { supabase } from '../supabase';

const CA_LANGUAGE_ID = 1;

interface RawCategoryRow {
  id: number;
  slug: string;
  category_translations:
    | { name: string; language_id: number }
    | { name: string; language_id: number }[]
    | null;
}

interface CategoryEntry {
  id: string;
  slug: string;
  name: string;
}

export function categoriesLoader() {
  return async (): Promise<CategoryEntry[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, category_translations!inner(name, language_id)')
      .eq('category_translations.language_id', CA_LANGUAGE_ID);

    if (error) throw error;
    if (!data?.length) return [];

    const rows = data as unknown as RawCategoryRow[];
    const entries: CategoryEntry[] = [];

    for (const row of rows) {
      const t = Array.isArray(row.category_translations)
        ? row.category_translations[0]
        : row.category_translations;
      const name = t?.name;
      if (!row.slug || !name) continue;
      entries.push({ id: row.slug, slug: row.slug, name });
    }

    return entries;
  };
}
