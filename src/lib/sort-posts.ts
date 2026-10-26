interface SortablePost {
  id: string;
  data: { sort_order: number; date: Date | string };
}

/**
 * Site order: sort order, then newest date, then id. Astro 7's content store
 * does not keep the loader's insertion order, so listings must sort explicitly.
 */
export function sortPosts<T extends SortablePost>(posts: readonly T[]): T[] {
  return [...posts].sort(
    (a, b) =>
      a.data.sort_order - b.data.sort_order ||
      new Date(b.data.date).getTime() - new Date(a.data.date).getTime() ||
      a.id.localeCompare(b.id)
  );
}
